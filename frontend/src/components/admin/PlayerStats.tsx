import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space } from 'antd';
import type { TableProps } from 'antd';

interface PlayerStat {
    match_id: string;
    ouid: string;
    spid: string;
    sp_grade: number;
    sp_level: number;
    spPosition: string;
    shoot: number;
    goal: number;
    assist: number;
    pass_try: number;
    pass_success: number;
    dribble_try: number;
    dribble_success: number;
    sp_rating: number;
}

interface PlayerStatsProps {
    matchId: string;
}

const PlayerStats: React.FC<PlayerStatsProps> = ({ matchId }) => {
    const [players, setPlayers] = useState<PlayerStat[]>([]);
    const [loading, setLoading] = useState(false);

    const columns: TableProps<PlayerStat>['columns'] = [
        {
            title: '선수 ID',
            dataIndex: 'spid',
            key: 'spid',
        },
        {
            title: '등급',
            dataIndex: 'sp_grade',
            key: 'sp_grade',
        },
        {
            title: '레벨',
            dataIndex: 'sp_level',
            key: 'sp_level',
        },
        {
            title: '포지션',
            dataIndex: 'spPosition',
            key: 'spPosition',
        },
        {
            title: '슈팅',
            dataIndex: 'shoot',
            key: 'shoot',
        },
        {
            title: '골',
            dataIndex: 'goal',
            key: 'goal',
        },
        {
            title: '도움',
            dataIndex: 'assist',
            key: 'assist',
        },
        {
            title: '패스 시도',
            dataIndex: 'pass_try',
            key: 'pass_try',
        },
        {
            title: '패스 성공',
            dataIndex: 'pass_success',
            key: 'pass_success',
        },
        {
            title: '드리블 시도',
            dataIndex: 'dribble_try',
            key: 'dribble_try',
        },
        {
            title: '드리블 성공',
            dataIndex: 'dribble_success',
            key: 'dribble_success',
        },
        {
            title: '평점',
            dataIndex: 'sp_rating',
            key: 'sp_rating',
        },
    ];

    const fetchPlayerStats = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/admin/db/player?match_id=${matchId}`);
            const data = await response.json();
            setPlayers(data);
        } catch (error) {
            console.error('선수 통계 조회 실패:', error);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (matchId) {
            fetchPlayerStats();
        }
    }, [matchId]);

    return (
        <div style={{ padding: '24px' }}>
            <Table
                columns={columns}
                dataSource={players}
                rowKey={(record) => `${record.match_id}-${record.spid}`}
                loading={loading}
            />
        </div>
    );
};

export default PlayerStats; 