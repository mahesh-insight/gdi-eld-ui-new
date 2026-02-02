import { ArrowUpIcon, ArrowDownIcon } from '@/lib/svg/svgList';
import { MetricLabel } from '@/common/MetricLabel';
import { CurrencyFormatter } from '@/common/CurrencyFormatter';
import { ChangeLabel } from '@/common/ChangeLabel';
import { formatMonthYear } from '@/lib/utils';

const iconPaths = {
  warning: "M256 32 0 480h512zm-32 160h64v160h-64zm0 256v-64h64v64z",
  error: "M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32m-32 352L96 256l45-45 83 83 147-147 45 45z",
  info: "M256 480c123.7 0 224-100.3 224-224S379.7 32 256 32 32 132.3 32 256s100.3 224 224 224m-32-352h64v160h-64zm0 256v-64h64v64z",
};

export default function M365Widget({ data = {} }) {
  const {
    cloudLicenseTotalSpend,
    latestBillableItemDate,
    latestChange,
    latestChangePercent,
    haveLatestChangePercent,
    subscriptionSummary,
    subscriptionExpirationSummary,
    currencyCode
  } = data;
  const totals = subscriptionSummary?.totals || [];
  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>M365 | Modern Work</h3>
      </div>
      <div className="widget-body">
        <div className="widget-metric">
          <div className="widget-metric-row">
            <MetricLabel title={`Invoiced M365 for ${latestBillableItemDate}`}>Latest Invoice</MetricLabel>
            <CurrencyFormatter
              title={`Invoiced M365 for ${formatMonthYear(latestBillableItemDate)}`}
              value={cloudLicenseTotalSpend}
              alignRight={true}
              showCurrencyCode={true}
              currency={currencyCode}
            />
          </div>
        </div>
        {latestChange !== 0 && (
          <div className="widget-change">
            <span className={`change-indicator ${latestChange > 0 ? 'up' : 'down'}`}>
              {latestChange > 0 ? <ArrowUpIcon className="svg-style" /> : <ArrowDownIcon className="svg-style"/>}
            </span>
            <ChangeLabel
              title={`Difference in spend on ${formatMonthYear(latestBillableItemDate)} M365 invoice from the previous month`}
              value={Math.abs(latestChange)}
              currency={currencyCode}
              percentage={latestChangePercent}
              showPercentage={haveLatestChangePercent}
            />
          </div>
        )}
        {subscriptionExpirationSummary && subscriptionExpirationSummary.length > 0 && (
          <div className="widget-alerts">
            {subscriptionExpirationSummary.map((alert, idx) => (
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
        <div className="widget-counts">
          {totals.map((item, idx) => {
            const colorClasses = ['vertical-pink', 'vertical-blue', 'vertical-gray'];
            const colorClass = colorClasses[idx] || 'vertical-gray';
            return (
              <div key={idx} className={`count-item ${colorClass}`}>
                <span className="count-label">{item.label}</span>
                <span className="count-value">{item.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
