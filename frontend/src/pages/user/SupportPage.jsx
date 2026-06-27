import React, { useState, useEffect } from 'react';
import { Row, Form } from 'antd';
import { message } from 'antd';
import incentiveService from '../../api/incentiveService';
import evModelService from '../../api/evModelService';
import { useAuthStore } from '../../store/authStore';
import HeroSection from './support/HeroSection';
import IncentivesSection from './support/IncentivesSection';
import CostComparisonCard from './support/CostComparisonCard';
import RegistrationForm from './support/RegistrationForm';
import VehicleShowcase from './support/VehicleShowcase';

const SupportPage = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [incentives, setIncentives] = useState([]);
    const [evModels, setEvModels] = useState([]);
    const { user } = useAuthStore();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [incentivesData, evModelsData] = await Promise.all([
                    incentiveService.getAll(),
                    evModelService.getAll()
                ]);
                setIncentives(incentivesData || []);
                setEvModels(evModelsData || []);
            } catch (error) {
                console.error('Failed to fetch data');
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (values) => {
        if (!user) {
            message.error('Vui lòng đăng nhập để đăng ký hỗ trợ');
            return;
        }
        setLoading(true);
        try {
            await incentiveService.register({
                incentive_id: values.incentive_id,
                vehicle_info: JSON.stringify({
                    old_vehicle: values.oldVehicle,
                    plate: values.plate,
                    new_vehicle_expected: values.newVehicle
                })
            });
            message.success('Đã gửi hồ sơ đăng ký thành công! Chúng tôi sẽ xét duyệt trong thời gian sớm nhất.');
            form.resetFields();
        } catch (error) {
            message.error('Lỗi khi gửi hồ sơ đăng ký');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: 1500, margin: '0 auto' }}>
            <HeroSection />

            <Row gutter={[24, 24]}>
                <IncentivesSection incentives={incentives} />

                <CostComparisonCard />

                <RegistrationForm
                    form={form}
                    incentives={incentives}
                    evModels={evModels}
                    loading={loading}
                    onFinish={handleSubmit}
                />

                <VehicleShowcase evModels={evModels} />
            </Row>
        </div>
    );
};

export default SupportPage;
