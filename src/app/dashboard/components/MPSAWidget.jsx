import { iconPaths } from "../iconConfig";

const labelMapping = {
  'ProductNames': { label: 'Products', color: 'vertical-pink', order: 0 },
  'Licenses': { label: 'Licenses', color: 'vertical-blue', order: 1 },
  'SoftwareAssurance': { label: 'Active SA', color: 'vertical-gray', order: 2 }
};

export default function MPSAWidget({ data = {} }) {
  const { mpsaExpirationSummaries, totals } = data;
  const mappedCounts = totals?.map(item => ({
    label: labelMapping[item.label]?.label || item.label,
    value: item.value,
    color: labelMapping[item.label]?.color || 'vertical-gray',
    order: labelMapping[item.label]?.order ?? 999
  })).sort((a, b) => a.order - b.order) || [];
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>Microsoft MPSA Licenses</h3>
      </div>
      <div className="widget-body">
        <div className="widget-counts">
          {mappedCounts.map((item, idx) => (
            <div key={idx} className={`count-item ${item.color}`}>
              <span className="count-label">{item.label}</span>
              <span className="count-value">{item.value}</span>
            </div>
          ))}
        </div>
        {mpsaExpirationSummaries && mpsaExpirationSummaries.length > 0 && (
          <div className="widget-alerts">
            {mpsaExpirationSummaries.map((alert, idx) => (
              <div key={idx} className={`alert alert-${alert.iconType}`}>
                <div className="alert-icon">
                  <svg viewBox="0 0 512 512" fill={alert.iconStatus} width="1em" height="1em">
                   {iconPaths[alert.iconType] && (
                      <path d={iconPaths[alert.iconType]} />
                    )}
                  </svg>
                </div>
                <span className="alert-message">{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
