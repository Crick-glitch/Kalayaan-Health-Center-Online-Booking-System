// DashboardLayout.js - sidebar (desktop) or drawer (below 992px) + header + page content.
// The role and name come from the logged-in user (AuthContext); the menu comes from navConfig.
// The collapse button lives in the top bar, so the sidebar header only ever holds the logo.
import { useState } from 'react';
import { Avatar, Button, Dropdown, Grid, Layout, Menu, Drawer, Tooltip, Typography } from 'antd';
import { CloseOutlined, LogoutOutlined, MedicineBoxFilled, MenuFoldOutlined, MenuOutlined, MenuUnfoldOutlined, UserOutlined } from '@ant-design/icons';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import clinic from '../config/clinic';
import { ROLE_PREFIX } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { fullName, initials } from '../utils/formatters';
import { NAV, ROLE_LABEL } from '../routes/navConfig';
import DemoBanner from '../components/common/DemoBanner';
import NotificationBell from '../components/layout/NotificationBell';
import ConfirmModal from '../components/common/ConfirmModal';

export default function DashboardLayout() {
  const { pathname } = useLocation(), navigate = useNavigate(), { user, logout } = useAuth(), prefix = ROLE_PREFIX[user.role].slice(1);
  const [collapsed, setCollapsed] = useState(false), [open, setOpen] = useState(false), [confirmLogout, setConfirmLogout] = useState(false);
  const desktop = !!Grid.useBreakpoint().lg, items = NAV[prefix] || [];
  const mini = collapsed && desktop; // true = icon-only sidebar
  // The active item is the menu key that matches the longest part of the current URL.
  const selected = items.filter((i) => pathname === i.key || pathname.startsWith(i.key + '/')).sort((a, b) => b.key.length - a.key.length)[0];
  const go = ({ key }) => {
    setOpen(false);
    if (key === 'logout') { setConfirmLogout(true); return; }
    navigate(key);
  };
  const confirmSignOut = () => { setConfirmLogout(false); logout(); navigate('/login'); };
  const menuItems = items.map((item) => ({ ...item, title: mini ? item.label : undefined }));
  const menu = <Menu className="kh-menu" mode="inline" inlineCollapsed={mini} items={menuItems} selectedKeys={selected ? [selected.key] : []} onClick={go} />;
  const side = (
    <div className="kh-sidebar-inner">
      <div className={`kh-sidebar-brand${mini ? ' is-mini' : ''}`}>
        <span className="kh-brand-mark" aria-hidden="true"><MedicineBoxFilled /></span>
        {!mini && <span className="kh-brand-text"><span className="kh-brand-name">{clinic.logoText}</span><span className="kh-brand-role">{ROLE_LABEL[prefix]}</span></span>}
        {!desktop && <Button className="kh-sidebar-close" type="text" aria-label="Close menu" icon={<CloseOutlined />} onClick={() => setOpen(false)} />}
      </div>
      <nav className="kh-sidebar-nav" aria-label="Sidebar">{menu}</nav>
      <div className={`kh-sidebar-footer${mini ? ' is-mini' : ''}`}>
        <Tooltip title={mini ? 'Log out' : null} placement="right">
          <button type="button" className="kh-sidebar-logout" aria-label="Log out" onClick={() => { setOpen(false); setConfirmLogout(true); }}>
            <LogoutOutlined />{!mini && <span>Log out</span>}
          </button>
        </Tooltip>
      </div>
    </div>
  );
  const userMenu = { items: [...(NAV[prefix]?.some((i) => i.label === 'Profile') ? [{ key: `/${prefix}/profile`, label: 'Profile', icon: <UserOutlined /> }] : []), { key: 'logout', label: 'Log out', icon: <LogoutOutlined /> }], onClick: go };
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="skip-link" href="#main">Skip to content</a>
      {desktop && <Layout.Sider className="kh-sider" width={256} collapsedWidth={80} collapsed={collapsed} trigger={null} theme="light">{side}</Layout.Sider>}
      <Drawer open={open && !desktop} onClose={() => setOpen(false)} placement="left" width={280} styles={{ body: { padding: 0 } }} closable={false}>{side}</Drawer>
      <Layout>
        <DemoBanner />
        <Layout.Header className="kh-topbar">
          <div className="kh-topbar-side">
            {desktop
              ? <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}><Button className="kh-topbar-toggle" type="text" size="large" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} /></Tooltip>
              : <Button className="kh-topbar-toggle" type="text" size="large" aria-label="Open menu" icon={<MenuOutlined />} onClick={() => setOpen(true)} />}
          </div>
          <div className="kh-topbar-side">
            <NotificationBell />
            <Dropdown menu={userMenu} trigger={['click']}>
              <Button className="kh-user-chip" type="text" aria-label="User menu">
                <Avatar size={32} style={{ background: '#0E7C86' }}>{initials(user)}</Avatar>
                {desktop && <span className="kh-user-name">{fullName(user)}</span>}
              </Button>
            </Dropdown>
          </div>
        </Layout.Header>
        <Layout.Content id="main" tabIndex={-1} style={{ padding: desktop ? 24 : 16 }}><div className="page-wrap"><Outlet /></div></Layout.Content>
      </Layout>
      <ConfirmModal open={confirmLogout} title="Log out?" okText="Log out" danger onConfirm={confirmSignOut} onCancel={() => setConfirmLogout(false)}>
        <Typography.Paragraph style={{ marginBottom: 0 }}>You’ll need to sign in again to access your account.</Typography.Paragraph>
      </ConfirmModal>
    </Layout>
  );
}