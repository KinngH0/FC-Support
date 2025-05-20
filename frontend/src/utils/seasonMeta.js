// 시즌 메타데이터를 불러오는 유틸리티
import axios from "axios";

export const fetchSeasonMeta = async () => {
  // 넥슨 공식 API에서 직접 불러오기
  const res = await axios.get("https://open.api.nexon.com/static/fconline/meta/seasonid.json");
  return res.data;
};

// seasonId(숫자 또는 문자열) => 시즌 메타 오브젝트 반환
export const getSeasonMetaMap = (seasonMetaArr) => {
  const map = {};
  for (const s of seasonMetaArr) {
    map[String(s.seasonId)] = s;
  }
  return map;
};

export const fetchPlayerMeta = async () => {
  // 넥슨 공식 API에서 선수 메타데이터 직접 불러오기
  const res = await axios.get("https://open.api.nexon.com/static/fconline/meta/spid.json");
  return res.data;
};
