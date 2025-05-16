import React, { useState, useEffect } from 'react';
import { Table, Input, Space, Pagination } from 'antd';
import type { TableProps } from 'antd';

interface MatchSummary {
    match_id: string;
    match_date: string;
    match_type: string;
    ouid: string;
    nickname: string;
    matchResult: string;
    controller: string;
    possession: number;
    averageRating: number;
    shoot_total: number;
    shoot_effective: number;
    goal_total: number;
    pass_try: number;
    pass_success: number;
    tackle_try: number;
    tackle_success: number;
}

const MatchList: React.FC = () => {
    const [matches, setMatches] = useState<MatchSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [size, setSize] = useState(10);
    const [nickname, setNickname] = useState('');
    const [ouid, setOuid] = useState('');

    const columns: TableProps<MatchSummary>['columns'] = [
        {
            title: '매치 ID',
            dataIndex: 'match_id',
            key: 'match_id',
        },
        {
            title: '매치 날짜',
            dataIndex: 'match_date',
            key: 'match_date',
        },
        {
            title: '닉네임',
            dataIndex: 'nickname',
            key: 'nickname',
        },
        {
            title: '매치 결과',
            dataIndex: 'matchResult',
            key: 'matchResult',
        },
        {
            title: '평균 평점',
            dataIndex: 'averageRating',
            key: 'averageRating',
        },
        {
            title: '슈팅',
            dataIndex: 'shoot_total',
            key: 'shoot_total',
        },
        {
            title: '유효 슈팅',
            dataIndex: 'shoot_effective',
            key: 'shoot_effective',
        },
        {
            title: '골',
            dataIndex: 'goal_total',
            key: 'goal_total',
        },
    ];

    const fetchMatches = async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/admin/db/match?page=${page}&size=${size}&nickname=${nickname}&ouid=${ouid}`
            );
            const data = await response.json();
            setMatches(data.data);
            setTotal(data.total);
        } catch (error) {
            console.error('매치 목록 조회 실패:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMatches();
    }, [page, size, nickname, ouid]);

    return (
        <div style={{ padding: '24px' }}>
            <Space style={{ marginBottom: '16px' }}>
                <Input
                    placeholder="닉네임 검색"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                />
                <Input
                    placeholder="OUID 검색"
                    value={ouid}
                    onChange={(e) => setOuid(e.target.value)}
                />
            </Space>
            
            <Table
                columns={columns}
                dataSource={matches}
                rowKey="match_id"
                loading={loading}
                pagination={false}
            />
            
            <Pagination
                current={page}
                pageSize={size}
                total={total}
                onChange={(p, s) => {
                    setPage(p);
                    setSize(s);
                }}
                style={{ marginTop: '16px', textAlign: 'right' }}
            />
        </div>
    );
};

export default MatchList; 