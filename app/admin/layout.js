import AdminSidebar from '@/components/layout/AdminSidebar';

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-950">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 text-white">{children}</main>
      </div>
    </div>
  );
}
