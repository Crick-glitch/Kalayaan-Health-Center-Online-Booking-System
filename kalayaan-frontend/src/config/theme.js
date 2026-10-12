// theme.js - Ant Design theme tokens. Passed to ConfigProvider in App.js.
const theme = {
  token: {
    colorPrimary: '#0E7C86', colorInfo: '#0E7C86', colorSuccess: '#2E9E6B', colorWarning: '#D98E04', colorError: '#C0392B',
    colorTextBase: '#0B2545', colorTextSecondary: '#5B6B7B', colorBgLayout: '#F5F7FA', colorBgContainer: '#FFFFFF',
    colorBorder: '#CDD8E2', colorBorderSecondary: '#E3EAF0', borderRadius: 6, fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Layout: { headerBg: '#FFFFFF', siderBg: '#FFFFFF', headerHeight: 64, headerPadding: '0 24px' },
    Menu: { itemColor: '#0B2545', itemSelectedColor: '#0E7C86', itemSelectedBg: '#E8F3FA', itemHoverBg: '#F5F7FA', itemBorderRadius: 0, itemMarginInline: 0 },
    Table: { headerBg: '#F5F7FA', headerColor: '#0B2545', cellPaddingBlock: 13 },
  },
};
export default theme;
