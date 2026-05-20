import React, { useState, useEffect } from 'react';
import { 
    Row, 
    Col, 
    Card, 
    Typography, 
    Avatar, 
    Button, 
    Tag, 
    Space, 
    Divider,
    Tabs,
    Form,
    Input,
    message,
    Upload
} from 'antd';
import {
    UserOutlined,
    EditOutlined,
    LockOutlined,
    EyeInvisibleOutlined,
    EyeTwoTone,
    SafetyCertificateOutlined,
    MailOutlined,
    PhoneOutlined,
    UploadOutlined,
    LoadingOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import userService from '../../api/userService';

const { Title, Text } = Typography;

const PRESET_AVATARS = [
    { id: '1', name: 'Eco Pioneer', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' },
    { id: '2', name: 'Lightning Rider', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka' },
    { id: '3', name: 'Green Traveler', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Spooky' },
    { id: '4', name: 'Volt Expert', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo' },
    { id: '5', name: 'Power Driver', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Buster' },
    { id: '6', name: 'Futuristic Eco', url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jasper' }
];

const UserProfile = () => {
    const { user, updateUser } = useAuthStore();
    const [activeTab, setActiveTab] = useState('1');
    const [profileSubmitLoading, setProfileSubmitLoading] = useState(false);
    const [passwordSubmitLoading, setPasswordSubmitLoading] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);

    const [profileForm] = Form.useForm();
    const [passwordForm] = Form.useForm();

    // Handle avatar upload
    const handleAvatarUpload = async ({ file, onSuccess, onError }) => {
        const formData = new FormData();
        formData.append('avatar', file);
        setUploadLoading(true);
        try {
            const res = await userService.uploadAvatar(formData);
            profileForm.setFieldValue('avatar_url', res.avatarUrl);
            message.success('Tải ảnh đại diện lên thành công! Nhấn Lưu thay đổi để áp dụng.');
            onSuccess(res.avatarUrl);
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.error || 'Lỗi khi tải ảnh đại diện lên.');
            onError(error);
        } finally {
            setUploadLoading(false);
        }
    };

    // Fetch profile on mount
    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                const profileData = await userService.getProfile();
                updateUser(profileData);
                
                // Initialize form with loaded values
                profileForm.setFieldsValue({
                    full_name: profileData.full_name,
                    phone: profileData.phone,
                    avatar_url: profileData.avatar_url
                });
            } catch (error) {
                console.error('Failed to fetch user profile details', error);
            }
        };

        if (user?.id) {
            fetchProfileData();
        }
    }, [user?.id]);

    // Update Form when user state in authStore changes
    useEffect(() => {
        if (user) {
            profileForm.setFieldsValue({
                full_name: user.full_name,
                phone: user.phone,
                avatar_url: user.avatar_url
            });
        }
    }, [user, profileForm]);

    // Handle Profile Edit
    const handleProfileSubmit = async (values) => {
        setProfileSubmitLoading(true);
        try {
            const res = await userService.updateProfile({
                full_name: values.full_name,
                phone: values.phone,
                avatar_url: values.avatar_url
            });
            updateUser(res.user);
            message.success('Cập nhật thông tin cá nhân thành công!');
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.error || 'Cập nhật thông tin cá nhân thất bại.');
        } finally {
            setProfileSubmitLoading(false);
        }
    };

    // Handle Password Change
    const handlePasswordSubmit = async (values) => {
        if (values.newPassword !== values.confirmPassword) {
            return message.error('Mật khẩu xác nhận không trùng khớp!');
        }
        setPasswordSubmitLoading(true);
        try {
            await userService.changePassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword
            });
            message.success('Thay đổi mật khẩu thành công!');
            passwordForm.resetFields();
        } catch (error) {
            console.error(error);
            message.error(error.response?.data?.error || 'Thay đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ!');
        } finally {
            setPasswordSubmitLoading(false);
        }
    };

    // Select preset avatar
    const selectPresetAvatar = (url) => {
        profileForm.setFieldValue('avatar_url', url);
        message.info('Đã chọn ảnh đại diện preset! Nhấn Lưu thay đổi để hoàn tất.');
    };

    // Tabs configuration
    const items = [
        {
            key: '1',
            label: (
                <span>
                    <EditOutlined /> Chỉnh sửa thông tin
                </span>
            ),
            children: (
                <div style={{ maxWidth: 600, margin: '10px auto' }}>
                    {/* Preset Avatars Selection */}
                    <div style={{ marginBottom: 28 }}>
                        <Text strong block style={{ marginBottom: 14, color: '#262626' }}>Chọn ảnh đại diện có sẵn:</Text>
                        <Row gutter={[12, 12]} justify="start">
                            {PRESET_AVATARS.map((av) => {
                                const currentAvatarUrl = Form.useWatch('avatar_url', profileForm) || user?.avatar_url;
                                const isSelected = currentAvatarUrl === av.url;
                                return (
                                    <Col key={av.id} span={4} style={{ textAlign: 'center' }}>
                                        <div 
                                            onClick={() => selectPresetAvatar(av.url)}
                                            style={{ 
                                                cursor: 'pointer', 
                                                border: isSelected ? '3px solid #1890ff' : '2px solid #f0f0f0',
                                                borderRadius: '50%',
                                                padding: 2,
                                                display: 'inline-block',
                                                transition: 'all 0.2s',
                                                transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                                boxShadow: isSelected ? '0 4px 12px rgba(24, 144, 255, 0.25)' : 'none'
                                            }}
                                        >
                                            <Avatar size={48} src={av.url} />
                                        </div>
                                        <div style={{ fontSize: 10, marginTop: 6, color: '#8c8c8c', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {av.name}
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>
                    </div>

                    <Form
                        form={profileForm}
                        layout="vertical"
                        onFinish={handleProfileSubmit}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Họ và tên"
                            name="full_name"
                            rules={[{ required: true, message: 'Vui lòng điền họ và tên!' }]}
                        >
                            <Input size="large" prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Nguyễn Văn A" style={{ borderRadius: 10 }} />
                        </Form.Item>

                        <Form.Item
                            label="Số điện thoại"
                            name="phone"
                            rules={[{ required: true, message: 'Vui lòng điền số điện thoại!' }]}
                        >
                            <Input size="large" prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />} placeholder="0912345678" style={{ borderRadius: 10 }} />
                        </Form.Item>

                        <Form.Item
                            label="Ảnh đại diện (Tải ảnh từ máy hoặc dùng preset phía trên)"
                            name="avatar_url"
                        >
                            <Space direction="vertical" style={{ width: '100%' }} size="middle">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <Avatar 
                                        size={64} 
                                        src={Form.useWatch('avatar_url', profileForm) || user?.avatar_url} 
                                        icon={<UserOutlined />}
                                        style={{ border: '2px solid #e6f7ff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                                    />
                                    <Upload
                                        customRequest={handleAvatarUpload}
                                        showUploadList={false}
                                        accept="image/*"
                                    >
                                        <Button 
                                            icon={uploadLoading ? <LoadingOutlined /> : <UploadOutlined />} 
                                            loading={uploadLoading}
                                            style={{ borderRadius: 8 }}
                                        >
                                            Chọn ảnh từ máy
                                        </Button>
                                    </Upload>
                                </div>
                                <Input 
                                    value={Form.useWatch('avatar_url', profileForm) || ''} 
                                    disabled
                                    placeholder="Đường dẫn ảnh đại diện sẽ tự động điền tại đây"
                                    style={{ borderRadius: 10, background: '#f5f5f5', color: '#8c8c8c' }} 
                                />
                            </Space>
                        </Form.Item>

                        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                            <Button type="primary" htmlType="submit" size="large" block loading={profileSubmitLoading} style={{ borderRadius: 12, height: 45, fontWeight: 'bold' }}>
                                Lưu thay đổi
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            )
        },
        {
            key: '2',
            label: (
                <span>
                    <LockOutlined /> Đổi mật khẩu
                </span>
            ),
            children: (
                <div style={{ maxWidth: 600, margin: '10px auto' }}>
                    <Form
                        form={passwordForm}
                        layout="vertical"
                        onFinish={handlePasswordSubmit}
                        requiredMark={false}
                    >
                        <Form.Item
                            label="Mật khẩu hiện tại"
                            name="currentPassword"
                            rules={[{ required: true, message: 'Vui lòng điền mật khẩu hiện tại!' }]}
                        >
                            <Input.Password 
                                size="large" 
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                                placeholder="Nhập mật khẩu hiện tại"
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                style={{ borderRadius: 10 }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Mật khẩu mới"
                            name="newPassword"
                            rules={[
                                { required: true, message: 'Vui lòng điền mật khẩu mới!' },
                                { min: 6, message: 'Mật khẩu phải có tối thiểu 6 ký tự!' }
                            ]}
                        >
                            <Input.Password 
                                size="large" 
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                style={{ borderRadius: 10 }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Xác nhận mật khẩu mới"
                            name="confirmPassword"
                            rules={[
                                { required: true, message: 'Vui lòng xác nhận mật khẩu mới!' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(new Error('Mật khẩu xác nhận không trùng khớp!'));
                                    },
                                }),
                            ]}
                        >
                            <Input.Password 
                                size="large" 
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} 
                                placeholder="Nhập lại mật khẩu mới"
                                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                                style={{ borderRadius: 10 }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
                            <Button type="primary" htmlType="submit" size="large" block loading={passwordSubmitLoading} style={{ borderRadius: 12, height: 45, fontWeight: 'bold' }}>
                                Cập nhật mật khẩu
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60, paddingTop: 10 }}>
            <Row gutter={[24, 24]}>
                {/* Profile Header */}
                <Col span={24}>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                        <Card style={{ borderRadius: 24, padding: '16px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.05)', background: '#fff' }}>
                            <Row align="middle" gutter={24}>
                                <Col>
                                    <Avatar 
                                        size={90} 
                                        icon={<UserOutlined />} 
                                        src={user?.avatar_url || "https://i.pravatar.cc/150?u=ev"} 
                                        style={{ border: '3px solid #e6f7ff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                    />
                                </Col>
                                <Col flex="auto">
                                    <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{user?.full_name || 'Người dùng'}</Title>
                                    <Space style={{ marginTop: 10 }} wrap size={16}>
                                        <Tag color="gold" icon={<SafetyCertificateOutlined />} style={{ borderRadius: 6, padding: '2px 8px', fontWeight: 500, border: 'none' }}>
                                            Thành viên EV
                                        </Tag>
                                        <Text type="secondary" style={{ fontSize: 14 }}>
                                            <MailOutlined style={{ marginRight: 6 }} />{user?.email}
                                        </Text>
                                        {user?.phone && (
                                            <>
                                                <Divider type="vertical" />
                                                <Text type="secondary" style={{ fontSize: 14 }}>
                                                    <PhoneOutlined style={{ marginRight: 6 }} />{user.phone}
                                                </Text>
                                            </>
                                        )}
                                    </Space>
                                </Col>
                            </Row>
                        </Card>
                    </motion.div>
                </Col>

                {/* Forms Tab Control */}
                <Col span={24}>
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
                        <Card style={{ borderRadius: 24, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.02)', padding: '12px 24px' }}>
                            <Tabs 
                                activeKey={activeTab} 
                                onChange={(key) => setActiveTab(key)} 
                                items={items} 
                                size="large"
                                tabBarStyle={{ borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}
                            />
                        </Card>
                    </motion.div>
                </Col>
            </Row>
        </div>
    );
};

export default UserProfile;
