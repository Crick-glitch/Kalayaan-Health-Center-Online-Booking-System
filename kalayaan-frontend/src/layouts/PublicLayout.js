// PublicLayout.js - top navbar + content + footer for the public pages.
import { useState } from 'react';
import { Button, Drawer, Grid, Layout, Menu } from 'antd';
import { MenuOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import clinic from '../config/clinic';
import DemoBanner from '../components/common/DemoBanner';

const LINKS = [['/', 'Home'], ['/about', 'About'], ['/services', 'Services'], ['/providers', 'Physicians']];

export default function PublicLayout() {
  const navigate = useNavigate(), { pathname } = useLocation(), [open, setOpen] = useState(false);
  const wide = !!Grid.useBreakpoint().xl;
  const drawerMenu = <Menu className="kh-public-drawer-menu" mode="inline" selectedKeys={[pathname]} items={LINKS.map(([key, label]) => ({ key, label }))} onClick={({ key }) => { navigate(key); setOpen(false); }} />;
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <a className="skip-link" href="#main">Skip to content</a>
      <DemoBanner />
      <Layout.Header className={`kh-public-header${wide ? ' is-wide' : ''}`}>
        {!wide && <Button type="text" icon={<MenuOutlined />} aria-label="Open menu" onClick={() => setOpen(true)} />}
        <Link to="/" className="kh-public-brand">✚ {wide ? clinic.name : clinic.shortName}</Link>
        {wide && <nav className="kh-public-nav" aria-label="Main navigation">
          {LINKS.map(([key, label]) => <Link key={key} to={key} className={`kh-public-nav-link${pathname === key ? ' is-active' : ''}`} aria-current={pathname === key ? 'page' : undefined}>{label}</Link>)}
        </nav>}
        <div className="kh-public-actions"><Button size={wide ? 'middle' : 'small'} onClick={() => navigate('/login')}>Login</Button><Button size={wide ? 'middle' : 'small'} type="primary" onClick={() => navigate('/register')}>Register</Button></div>
      </Layout.Header>
      <Drawer open={open} onClose={() => setOpen(false)} placement="left" width={280} title={clinic.name} styles={{ body: { padding: 0 } }}>{drawerMenu}</Drawer>
      <Layout.Content id="main" tabIndex={-1} style={{ padding: 24 }}><div style={{ maxWidth: 1120, margin: '0 auto' }}><Outlet /></div></Layout.Content>
      <Layout.Footer style={{ background: '#fff', borderTop: '1px solid #E3EAF0', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <span>{clinic.name} · {clinic.address} · {clinic.phone} · {clinic.hours}</span><Link to="/privacy">Privacy</Link>
      </Layout.Footer>
    </Layout>
  );
}
