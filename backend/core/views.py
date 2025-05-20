from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from core.models import Player
import requests
from rest_framework.decorators import api_view, renderer_classes
from rest_framework.response import Response
from django.db.models import Count, F, Value, CharField
from django.db.models.functions import Concat
from .models import Manager, Player, Notice, Update, Resource, VisitorLog, Review
from collections import defaultdict
from rest_framework.renderers import JSONRenderer
from rest_framework import viewsets
from .serializers import NoticeSerializer, UpdateSerializer, ResourceSerializer, ReviewSerializer
from rest_framework.permissions import IsAdminUser
from django.utils import timezone

META_SPID_URL = 'https://open.api.nexon.com/static/fconline/meta/spid.json'
META_SEASON_URL = 'https://open.api.nexon.com/static/fconline/meta/seasonid.json'
META_POSITION_URL = 'https://open.api.nexon.com/static/fconline/meta/spposition.json'

META_SPID = None
META_SEASON = None
META_POSITION = None

# 서버 시작 시 메타데이터 캐싱
if META_SPID is None:
    META_SPID = {str(item['id']): item['name'] for item in requests.get(META_SPID_URL).json()}
if META_SEASON is None:
    META_SEASON = {int(item['seasonId']): item['className'] for item in requests.get(META_SEASON_URL).json()}
if META_POSITION is None:
    META_POSITION = {int(item['spposition']): item['desc'] for item in requests.get(META_POSITION_URL).json()}

@require_GET
def player_list(request):
    match_id = request.GET.get('match_id')
    qs = Player.objects.all().select_related('manager')
    if match_id:
        qs = qs.filter(match_id=match_id)
    qs = qs.order_by('manager__rank', 'position_id')

    result = []
    for p in qs:
        spid_str = str(p.spid)
        season_id = p.season_id
        position_id = p.position_id
        result.append({
            '순위': p.manager.rank,
            '닉네임': p.manager.nickname,
            '팀컬러': p.manager.team_color,
            '포지션': META_POSITION.get(position_id, position_id),
            '선수 이름': META_SPID.get(spid_str, spid_str),
            '시즌': META_SEASON.get(season_id, season_id),
            '강화단계': p.grade,
            '등록시간': p.created_at.strftime('%Y-%m-%d %H:%M:%S'),
        })
    return JsonResponse(result, safe=False)

@api_view(['GET'])
def get_pick_rate(request):
    try:
        rank_range = int(request.GET.get('rank_range', 100))
        team_color = request.GET.get('team_color', '')
        top_n = int(request.GET.get('top_n', 3))

        # 1. 매니저 필터링
        try:
            manager_filter = {'rank__lte': rank_range}
            if team_color:
                manager_filter['team_color'] = team_color
            filtered_managers = Manager.objects.filter(**manager_filter)
        except Exception as e:
            return Response({"error": f"[1] Manager 필터링 오류: {str(e)}"}, status=400)

        if not filtered_managers.exists():
            return Response({"error": "[1] 조건에 일치하는 매니저가 없습니다."}, status=404)

        # 1-1. 조회 인원(매니저 수)
        try:
            manager_count = filtered_managers.count()
        except Exception as e:
            return Response({"error": f"[1-1] 매니저 수 계산 오류: {str(e)}"}, status=400)

        # 1-2. 포메이션 집계
        try:
            formation_stats = (
                filtered_managers.values('formation')
                .annotate(count=Count('id'))
                .order_by('-count')
            )
            formation_total = manager_count if manager_count else 1
            formation_rank = [
                {
                    'rank': idx + 1,
                    'formation': f['formation'],
                    'percentage': round(f['count'] * 100.0 / formation_total, 1),
                    'count': f['count'],
                    'top_users': list(
                        filtered_managers.filter(formation=f['formation'])
                        .values_list('nickname', flat=True)
                        .order_by('rank')[:3]
                    )
                }
                for idx, f in enumerate(formation_stats)
            ]
        except Exception as e:
            return Response({"error": f"[1-2] 포메이션 집계 오류: {str(e)}"}, status=400)

        # 1-3. 평균/최저/최고 등수(점수), 구단가치
        try:
            rank_list = list(filtered_managers.values_list('rank', flat=True))
            score_list = list(filtered_managers.values_list('score', flat=True))
            club_value_list = list(filtered_managers.values_list('club_value', flat=True))
            
            def safe_stats(lst, managers, field, is_rank=False):
                if not lst:
                    return {'avg': None, 'min': None, 'max': None, 'min_nickname': None, 'max_nickname': None}
                try:
                    min_value = min(lst)
                    max_value = max(lst)
                    min_manager = managers.filter(**{field: min_value}).first()
                    max_manager = managers.filter(**{field: max_value}).first()
                    if is_rank:
                        # 등수는 min이 최고, max가 최저
                        return {
                            'avg': round(sum(lst) / len(lst), 1),
                            'max': min_value,
                            'min': max_value,
                            'max_nickname': min_manager.nickname if min_manager else None,
                            'min_nickname': max_manager.nickname if max_manager else None
                        }
                    else:
                        return {
                            'avg': round(sum(lst) / len(lst), 1),
                            'min': min_value,
                            'max': max_value,
                            'min_nickname': min_manager.nickname if min_manager else None,
                            'max_nickname': max_manager.nickname if max_manager else None
                        }
                except Exception as e:
                    return {'avg': None, 'min': None, 'max': None, 'min_nickname': None, 'max_nickname': None}
            
            rank_stats = safe_stats(rank_list, filtered_managers, 'rank', is_rank=True)
            score_stats = safe_stats(score_list, filtered_managers, 'score')
            club_value_stats = safe_stats(club_value_list, filtered_managers, 'club_value')
        except Exception as e:
            return Response({"error": f"[1-3] 통계 계산 오류: {str(e)}"}, status=400)

        # 2. 기준 데이터 계산
        try:
            base_date = Player.objects.latest('created_at').created_at
            total_count = manager_count
            total_managers = Manager.objects.count()
            percentage = round((total_count / total_managers) * 100, 1)
        except Exception as e:
            return Response({"error": f"[2] 기준 데이터 계산 오류: {str(e)}"}, status=400)

        # 3. 포지션별 선수 집계
        try:
            position_groups = {
                'ST': ['LS', 'ST', 'RS'],
                'CF': ['LF', 'CF', 'RF'],
                'LW': ['LW'],
                'RW': ['RW'],
                'CAM': ['CAM'],
                'RAM': ['RAM'],
                'LAM': ['LAM'],
                'RM': ['RM'],
                'LM': ['LM'],
                'CM': ['LCM', 'CM', 'RCM'],
                'CDM': ['LDM', 'CDM', 'RDM'],
                'CB': ['LCB', 'CB', 'SW', 'RCB'],
                'LB': ['LWB', 'LB'],
                'RB': ['RWB', 'RB'],
                'GK': ['GK']
            }

            result = {}
            for position, sub_positions in position_groups.items():
                try:
                    # 매니저별로 중복 없이 선수/시즌/강화단계 조합 추출
                    unique_players = (
                        Player.objects.filter(
                            manager__in=filtered_managers,
                            position__in=sub_positions
                        )
                        .values('manager_id', 'player_name', 'season', 'grade')
                        .distinct()
                    )
                    # 선수별로 집계
                    player_counter = {}
                    for up in unique_players:
                        key = (up['player_name'], up['season'], up['grade'])
                        if key not in player_counter:
                            player_counter[key] = set()
                        player_counter[key].add(up['manager_id'])
                    # 집계 결과 정렬 및 top_n 적용
                    player_list = [
                        {
                            'player_name': k[0],
                            'season': k[1],
                            'grade': k[2],
                            'user_count': len(v)
                        }
                        for k, v in player_counter.items()
                    ]
                    player_list.sort(key=lambda x: (-x['user_count'], -int(x['season'] if str(x['season']).isdigit() else 0), -x['grade']))
                    player_list = player_list[:top_n]
                    # 사용률 계산 및 top_users 추출
                    position_total = manager_count if manager_count else 1
                    for p in player_list:
                        p['usage_rate'] = round(p['user_count'] * 100.0 / position_total, 1)
                        top_nicknames = list(
                            Player.objects.filter(
                                manager__in=filtered_managers,
                                position__in=sub_positions,
                                player_name=p['player_name'],
                                season=p['season'],
                                grade=p['grade']
                            ).values_list('manager__nickname', flat=True).distinct()[:3]
                        )
                        p['top_users'] = top_nicknames
                        p['remaining_users'] = p['user_count'] - len(top_nicknames)
                    if player_list:
                        result[position] = player_list
                except Exception as e:
                    print(f"포지션 {position} 처리 중 오류 발생: {str(e)}")
                    continue
        except Exception as e:
            return Response({"error": f"[3] 포지션별 선수 집계 오류: {str(e)}"}, status=400)

        # 4. 기준 데이터와 집계 데이터 추가
        result['base_date'] = base_date.strftime('%Y년 %m월 %d일 %H시')
        result['total_count'] = total_count
        result['percentage'] = percentage
        result['manager_count'] = manager_count
        result['formation_rank'] = formation_rank
        result['rank_stats'] = rank_stats
        result['score_stats'] = score_stats
        result['club_value_stats'] = club_value_stats

        return Response(result)

    except Exception as e:
        return Response({"error": f"[0] 전체 예외: {str(e)}"}, status=400)

@api_view(['GET'])
@renderer_classes([JSONRenderer])
def get_base_date(request):
    try:
        latest = Player.objects.order_by('-created_at').first()
        if latest:
            formatted = latest.created_at.strftime('%y년 %m월 %d일 %H시 %M분 %S초 데이터')
            return Response({'base_date': formatted})
        else:
            return Response({'base_date': '-'}, status=200)
    except Exception:
        return Response({'base_date': '-'}, status=200)

@api_view(['GET'])
@renderer_classes([JSONRenderer])
def get_team_color_stats(request):
    try:
        rank_range = int(request.GET.get('rank_range', 100))
        top_n = int(request.GET.get('top_n', 10))
        managers = Manager.objects.filter(rank__lte=rank_range)
        total = managers.count() if managers.exists() else 1
        color_stats = (
            managers.values('team_color')
            .exclude(team_color='')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        result = []
        for idx, color in enumerate(color_stats[:top_n]):
            color_managers = managers.filter(team_color=color['team_color'])
            count = color['count']
            percent = round(count * 100.0 / total, 1)
            # 구단가치, 랭킹, 점수 통계 및 닉네임
            def stat(field):
                values = list(color_managers.values_list(field, flat=True))
                if not values:
                    return {'avg': None, 'min': None, 'max': None, 'min_nickname': None, 'max_nickname': None}
                min_value = min(values)
                max_value = max(values)
                min_manager = color_managers.filter(**{field: min_value}).first()
                max_manager = color_managers.filter(**{field: max_value}).first()
                return {
                    'avg': round(sum(values) / len(values), 1),
                    'min': min_value,
                    'max': max_value,
                    'min_nickname': min_manager.nickname if min_manager else None,
                    'max_nickname': max_manager.nickname if min_manager else None
                }
            # 포메이션 순위 3위까지
            formation_stats = (
                color_managers.values('formation')
                .exclude(formation='')
                .annotate(count=Count('id'))
                .order_by('-count')[:3]
            )
            formation_rank = [
                {
                    'rank': i + 1,
                    'formation': f['formation'],
                    'count': f['count']
                }
                for i, f in enumerate(formation_stats)
            ]
            result.append({
                'rank': idx + 1,
                'team_color': color['team_color'],
                'count': count,
                'percentage': percent,
                'details': {
                    'club_value': stat('club_value'),
                    'rank': stat('rank'),
                    'score': stat('score'),
                    'formation_rank': formation_rank,
                }
            })
        return Response({'results': result})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

class NoticeViewSet(viewsets.ModelViewSet):
    queryset = Notice.objects.all().order_by('-date')
    serializer_class = NoticeSerializer
    def get_permissions(self):
        # 읽기(GET, HEAD, OPTIONS)는 모두 허용, 쓰기(POST, PATCH, DELETE)는 관리자만
        if self.action in ['list', 'retrieve']:
            from rest_framework.permissions import AllowAny
            return [AllowAny()]
        from rest_framework.permissions import IsAdminUser
        return [IsAdminUser()]

class UpdateViewSet(viewsets.ModelViewSet):
    queryset = Update.objects.all().order_by('-date')
    serializer_class = UpdateSerializer

class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all().order_by('-date')
    serializer_class = ResourceSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-created_at')
    serializer_class = ReviewSerializer
    # 누구나 읽기/쓰기 가능(비밀번호 검증은 삭제/수정에서 프론트/추후 커스텀)
    def get_permissions(self):
        from rest_framework.permissions import AllowAny
        return [AllowAny()]

    def get_queryset(self):
        qs = super().get_queryset()
        spid = self.request.query_params.get('spid')
        season_id = self.request.query_params.get('season_id')
        # spid는 DB에 6자리(시즌+pid)로 저장되어 있으므로, 프론트에서 넘어온 값이 6자리인지 확인
        if spid and len(spid) == 6:
            qs = qs.filter(spid=spid)
        elif spid and len(spid) == 5:
            # 혹시 5자리로 넘어오면 앞에 0을 붙여서 6자리로 맞춤
            qs = qs.filter(spid=f"0{spid}")
        if season_id:
            qs = qs.filter(season_id=season_id)
        return qs

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        # grade(강화단계) 필드가 없으면 1로 기본값
        if 'grade' not in data:
            data['grade'] = 1
        # IP 저장: X-Forwarded-For, Proxy-Client-IP, WL-Proxy-Client-IP, REMOTE_ADDR 순서로 시도
        ip = (
            request.META.get('HTTP_X_FORWARDED_FOR') or
            request.META.get('HTTP_PROXY_CLIENT_IP') or
            request.META.get('HTTP_WL_PROXY_CLIENT_IP') or
            request.META.get('REMOTE_ADDR')
        )
        if ip and ',' in ip:
            ip = ip.split(',')[0].strip()
        data['ip'] = ip if ip else None
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        password = request.data.get('password')
        if not password or password != instance.password:
            from rest_framework.response import Response
            return Response({'detail': '비밀번호가 일치하지 않습니다.'}, status=400)
        return super().destroy(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        password = request.data.get('password')
        # 추천/비추천 처리
        if request.data.get('good') is True or request.data.get('good') == 'true':
            instance.good = (instance.good or 0) + 1
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        if request.data.get('bad') is True or request.data.get('bad') == 'true':
            instance.bad = (instance.bad or 0) + 1
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        # 기존 비밀번호 검증 및 수정 로직
        if not password or password != instance.password:
            from rest_framework.response import Response
            return Response({'detail': '비밀번호가 일치하지 않습니다.'}, status=400)
        return super().partial_update(request, *args, **kwargs)

@api_view(['POST'])
def log_visitor(request):
    ip = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    VisitorLog.objects.create(ip=ip, user_agent=user_agent)
    return Response({'status': 'ok'})

@api_view(['GET'])
def today_visitor_count(request):
    today = timezone.now().date()
    count = VisitorLog.objects.filter(created_at__date=today).values('ip').distinct().count()
    return Response({'today_visitor_count': count})
