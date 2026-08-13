import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/layout/AppShell';
import { EstimateList } from '@/components/estimate/EstimateList';

export default function AllEstimates() {
  return (
    <>
      <Link
        to="/estimates"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink transition-colors"
      >
        <ArrowLeft size={15} />
        Back to dashboard
      </Link>
      
      <PageHeader
        eyebrow="Archive"
        title="All Estimates"
        description="Browse and filter the complete historical record of Furnix estimates."
      />

      <EstimateList initialPageSize={10} showViewAllLink={false} hidePagination={false} />
    </>
  );
}
