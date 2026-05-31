import React, { useState, useEffect, useMemo } from 'react';
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
    const [mileage, setMileage] = useState(50);
    const [fuelPrice, setFuelPrice] = useState(24000);
    const [evPrice, setEvPrice] = useState(3000);
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

    const costData = useMemo(() => {
        const data = [];
        const monthlyKm = mileage * 30;
        const gasConsumption = 8 / 100;
        const evConsumption = 15 / 100;
        const monthlyGasCost = monthlyKm * gasConsumption * fuelPrice;
        const monthlyEvCost = monthlyKm * evConsumption * evPrice;

        for (let i = 0; i <= 60; i += 12) {
            data.push({
                month: i.toString(),
                gas: Math.round(monthlyGasCost * i),
                ev: Math.round(monthlyEvCost * i),
            });
        }
        return data;
    }, [mileage, fuelPrice, evPrice]);

    const savingsPerMonth = useMemo(() => {
        const monthlyKm = mileage * 30;
        const gasCost = monthlyKm * (8 / 100) * fuelPrice;
        const evCost = monthlyKm * (15 / 100) * evPrice;
        return gasCost - evCost;
    }, [mileage, fuelPrice, evPrice]);

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
        <div style={{ maxWidth: 1500, margin: '0 auto', paddingBottom: 100 }}>
            <HeroSection />

            <Row gutter={[24, 24]}>
                <IncentivesSection incentives={incentives} />

                <CostComparisonCard
                    costData={costData}
                    mileage={mileage}
                    fuelPrice={fuelPrice}
                    evPrice={evPrice}
                    savingsPerMonth={savingsPerMonth}
                    setMileage={setMileage}
                    setFuelPrice={setFuelPrice}
                    setEvPrice={setEvPrice}
                />

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
