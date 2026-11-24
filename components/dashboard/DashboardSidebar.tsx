// components/dashboard/DashboardSidebar.tsx
"use client";

import { useParams, useSearchParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Home,
  CalendarDays,
  Users,
  Stethoscope,
  Settings,
  PanelRightClose,
  PanelRightOpen,
  LucideIcon,
} from "lucide-react";
import { Clinic } from "@/types";
import Image from "next/image";

// ✅ تعريف موحد للعناصر
interface NavItem {
  tab: string;
  label: string;
  icon: LucideIcon;
}

const menuItems: NavItem[] = [
  { tab: "main", label: "الرئيسية", icon: Home },
  { tab: "schedule", label: "المواعيد", icon: CalendarDays },
  { tab: "patients", label: "المرضى", icon: Users },
  { tab: "treatments", label: "العلاجات", icon: Stethoscope },
  { tab: "settings", label: "الإعدادات", icon: Settings },
];

interface DashboardSidebarProps {
  clinicData: Clinic | null;
}

// مكون Tooltip للوضع المطوي في الديسكتوب
const CollapsedTooltip = ({ text }: { text: string }) => (
  <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-xl">
    {text}
    <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1 border-4 border-transparent border-l-slate-800" />
  </div>
);

// مكون Skeleton
const SidebarSkeleton = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <div
    className={`hidden md:flex h-screen bg-white border-e border-slate-200 flex-col ${isCollapsed ? "w-20" : "w-64"}`}
  >
    <div className="h-16 border-b border-slate-100 flex items-center px-4 gap-3">
      <div className="w-8 h-8 bg-slate-100 rounded-lg animate-pulse" />
      {!isCollapsed && (
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
      )}
    </div>
    <div className="p-3 space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`flex items-center gap-3 p-2 rounded-xl ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="w-5 h-5 bg-slate-100 rounded animate-pulse" />
          {!isCollapsed && (
            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
          )}
        </div>
      ))}
    </div>
  </div>
);

export function DashboardSidebar({ clinicData }: DashboardSidebarProps) {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clinicId = params?.clinicId as string;
  const currentTab = searchParams.get("tab") || "main";

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [autoCollapse, setAutoCollapse] = useState(true);
  const [optimisticTab, setOptimisticTab] = useState<string | null>(null);

  const activeTabForUI = optimisticTab ?? currentTab;
  const primaryColor = clinicData?.settings?.primaryColor || "#0284C7";

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const savedSettings = localStorage.getItem("dashboard_settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoCollapse(settings.autoCollapse ?? true);
      } catch (e) {}
    }

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setOptimisticTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    // منطق الطي التلقائي للديسكتوب فقط
    if (!isMobile && autoCollapse && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [isMobile, autoCollapse]);

  const navigateToTab = (tab: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setOptimisticTab(tab);
    router.push(`/dashboard/${clinicId}?tab=${tab}`);
  };

  if (!mounted) return null;
  if (!clinicData) return <SidebarSkeleton isCollapsed={isCollapsed} />;

  // ✅ شريط الهاتف السفلي (Native-like & Clean)
  const MobileBottomNav = () => (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/90 backdrop-blur-lg border-t border-slate-200/70 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16 px-1 gap-0.5" dir="rtl">
        {menuItems.map((item) => {
          const isActive = activeTabForUI === item.tab;
          const Icon = item.icon;
          return (
            <button
              key={item.tab}
              onClick={(e) => navigateToTab(item.tab, e)}
              className={`relative flex flex-col items-center justify-center min-h-[52px] px-0.5 transition-colors duration-150 ${
                isActive ? "text-sky-600" : "text-slate-500"
              }`}
            >
              {/* خلفية ناعمة مدمجة للعنصر النشط */}
              {isActive && (
                <motion.div
                  layoutId="mobileActiveBg"
                  className="absolute inset-x-1 inset-y-1.5 bg-sky-50/80 rounded-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                />
              )}

              <Icon
                size={22}
                strokeWidth={isActive ? 2.2 : 1.75}
                className={`mb-0.5 transition-transform duration-150 ${isActive ? "scale-105" : ""}`}
              />
              <span
                className={`text-[11px] whitespace-nowrap ${isActive ? "font-semibold" : "font-medium"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );

  // ✅ شريط سطح المكتب الجانبي (لم يتغير منطقياً، فقط تحسينات بصرية طفيفة)
  const DesktopSidebar = () => (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.7 }}
      className="hidden md:flex flex-col h-screen max-h-screen overflow-hidden bg-white border-e border-slate-200 sticky top-0 shrink-0 z-40 will-change-[width]"
    >
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden relative">
            {clinicData.logo?.startsWith("/") ||
            clinicData.logo?.startsWith("http") ? (
              <Image
                src={clinicData.logo}
                alt="Logo"
                fill
                className="object-contain p-1"
              />
            ) : (
              <span className="text-lg">{clinicData.logo || "🦷"}</span>
            )}
          </div>
          <AnimatePresence initial={false}>
            {!isCollapsed && (
              <motion.div
                key="clinic-details"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className="flex flex-col min-w-0"
              >
                <h2 className="text-sm font-bold text-slate-800 truncate">
                  {clinicData.name}
                </h2>
                <p className="text-[10px] text-slate-500 truncate">
                  {clinicData.doctorProfile.fullName}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0 ml-2"
        >
          {isCollapsed ? (
            <PanelRightOpen size={18} />
          ) : (
            <PanelRightClose size={18} />
          )}
        </button>
      </div>

      <nav className="shrink-0 p-3 space-y-1 overflow-hidden">
        {menuItems.map((item) => {
          const isActive = activeTabForUI === item.tab;
          const Icon = item.icon;

          return (
            <div key={item.tab} className="relative group">
              <button
                onClick={(e) => navigateToTab(item.tab, e)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-[gap,padding,background-color,color] duration-200 ease-out
                  ${isCollapsed ? "justify-center" : ""}
                  ${
                    isActive
                      ? "bg-sky-50 text-sky-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
                style={{
                  backgroundColor:
                    isActive && !isCollapsed ? `${primaryColor}10` : undefined,
                  color: isActive && !isCollapsed ? primaryColor : undefined,
                }}
              >
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.75}
                  className="shrink-0"
                />
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.span
                      key={`${item.tab}-label`}
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 5 }}
                      transition={{ duration: 0.14, ease: "easeOut" }}
                      className="text-sm truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
              {isCollapsed && <CollapsedTooltip text={item.label} />}
            </div>
          );
        })}
      </nav>
    </motion.aside>
  );

  return (
    <>
      {/* سطح المكتب */}
      <DesktopSidebar />

      {/* الهاتف: شريط سفلي فقط (بدون زر برجر) */}
      {isMobile && <MobileBottomNav />}

      {/* إضافة مسافة أسفل المحتوى في الهاتف لتعويض الشريط الثابت */}
      {isMobile && <div className="h-20 md:hidden" />}
    </>
  );
}
