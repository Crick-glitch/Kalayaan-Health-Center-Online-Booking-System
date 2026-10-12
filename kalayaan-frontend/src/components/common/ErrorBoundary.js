// ErrorBoundary.js - catches a crashed page and shows the 500 screen instead of a blank page.
import { Component } from 'react';
import { Button, Result } from 'antd';

export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return <Result status="500" title="Something went wrong" subTitle="The page crashed. Try again." extra={<Button type="primary" onClick={() => window.location.assign('/')}>Reload</Button>} />;
  }
}
