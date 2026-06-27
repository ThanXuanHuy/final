import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Typography, DatePicker, Button, Table, Tag, Space, Progress, message, Spin } from 'antd';
import { FileSearchOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import userService from '../../api/userService';

const { Title } = Typography;

const AdminReports = () => {
    const [dates, setDates] = useState(null);
    const [loading, setLoading] = useState(false);
    const [bookingsData, setBookingsData] = useState({ total: 0, chartData: [] });
    const [revenueData, setRevenueData] = useState({ total: 0, stations: [] });

    const fetchData = async () => {
        setLoading(true);
        try {
            let params = {};
            if (dates && dates[0] && dates[1]) {
                params.startDate = dates[0].format('YYYY-MM-DD');
                params.endDate = dates[1].format('YYYY-MM-DD');
            }
            const [bRes, rRes] = await Promise.all([
                userService.getReportBookings(params),
                userService.getReportRevenue(params)
            ]);
            setBookingsData(bRes || { total: 0, chartData: [] });
            setRevenueData(rRes || { total: 0, stations: [] });
        } catch (error) {
            console.error('Failed to fetch report data', error);
            message.error('Lỗi khi tải dữ liệu báo cáo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleExport = ({ key }) => {
        if (key === 'xlsx') {
            const hide = message.loading('Đang xử lý dữ liệu...', 0);
            setTimeout(() => {
                let csvContent = "\uFEFF";

                // Section 1: Revenue Table
                csvContent += "BAO CAO DOANH THU VA TRANG THAI\n";
                csvContent += ['Trạm Sạc', 'Cổng sạc', 'Doanh thu (VNĐ)', 'Lượt đặt', 'Trạng thái'].join(',') + '\n';
                const revRows = (revenueData?.stations || []).map(s => [
                    s.station_name || 'Khong xac dinh',
                    `Cổng ${s.port_number} (${s.charger_type || 'N/A'})`,
                    s.total_revenue || 0,
                    s.total_bookings || 0,
                    ['AVAILABLE', 'CHARGING'].includes(s.charger_status) ? 'Hoạt động' : 'Bảo trì'
                ]);
                csvContent += revRows.map(e => e.join(',')).join('\n') + '\n\n';

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', `bao_cao_tong_hop.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                hide();
                message.info('Báo cáo đã được tạo. Vui lòng kiểm tra hộp thoại tải xuống!');
            }, 800);
        } else if (key === 'pdf') {
            const hide = message.loading('Đang chuẩn bị cấu hình máy in...', 0);
            setTimeout(() => {
                hide();
                window.print();
            }, 800);
        }
    };

    return (
        <div>
            <Card style={{ marginBottom: 24, borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '24px' }}>
                <Row gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={8}>
                        <DatePicker.RangePicker
                            style={{ width: '100%' }}
                            onChange={(val) => setDates(val)}
                        />
                    </Col>
                    <Col xs={24} md={16} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button type="primary" onClick={fetchData}>Làm mới dữ liệu</Button>
                            <Button icon={<FileExcelOutlined style={{ color: '#52c41a' }} />} onClick={() => handleExport({ key: 'xlsx' })}>Xuất Excel</Button>
                            <Button icon={<FilePdfOutlined style={{ color: '#f5222d' }} />} onClick={() => handleExport({ key: 'pdf' })}>Xuất PDF</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" /></div>
            ) : (
                <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        {/* Biểu đồ Đặt lịch */}
                        <Col span={24}>
                            <Card title="Tần suất đặt lịch theo tháng">
                                <div style={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={bookingsData?.chartData || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="bookings" fill="#52c41a" name="Lượt đặt" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Bảng Doanh thu */}
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Card title={
                                <Space>
                                    <FileSearchOutlined />
                                    <span>Doanh thu theo trạm / loại trụ</span>
                                    <Tag color="red">Tổng doanh thu: {Number(revenueData?.total || 0).toLocaleString('vi-VN')} VNĐ</Tag>
                                </Space>
                            }>
                                <Table
                                    pagination={{ defaultPageSize: 10, showSizeChanger: true, pageSizeOptions: ['5', '10', '20', '50', '100'] }}
                                    dataSource={(revenueData?.stations || []).map((s, index) => ({
                                        key: `${s.station_id}-${s.charger_id}`,
                                        name: s.station_name,
                                        port: `Cổng ${s.port_number} (${s.charger_type || 'Không xác định'})`,
                                        revenue: `${Number(s.total_revenue || 0).toLocaleString('vi-VN')}đ`,
                                        usage: Math.min(100, Math.round((Number(s.total_bookings || 0) / 100) * 100)) + '%',
                                        status: ['AVAILABLE', 'CHARGING'].includes(s.charger_status) ? 'Hoạt động' : 'Bảo trì'
                                    }))}
                                    columns={[
                                        { title: 'Trạm Sạc', dataIndex: 'name', key: 'name' },
                                        { title: 'Cổng sạc', dataIndex: 'port', key: 'port' },
                                        { title: 'Doanh thu (Tổng)', dataIndex: 'revenue', key: 'revenue' },
                                        { title: 'Hiệu suất khai thác', dataIndex: 'usage', key: 'usage', render: (val) => <Progress percent={parseInt(val)} size="small" status={parseInt(val) > 80 ? 'success' : 'normal'} /> },
                                        { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'Hoạt động' ? 'green' : 'orange'}>{status}</Tag> }
                                    ]}
                                />
                            </Card>
                        </Col>
                    </Row>
                </>
            )}
        </div>
    );
};

export default AdminReports;
