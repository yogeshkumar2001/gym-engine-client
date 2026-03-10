import OwnerSidebar from '@/components/layout/OwnerSidebar';

export default function OwnerLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <OwnerSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
