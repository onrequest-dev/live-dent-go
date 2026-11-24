// components/dashboard/tabs/SettingsTab.tsx
"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Settings,
  MessageCircle,
  Share2,
  Building2,
  UserCircle,
  LogOut,
  Download,
  Smartphone,
  CheckCircle2,
  Lock,
  Stethoscope,
  Palette,
  Bell,
  LayoutGrid,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { AccountSwitcher } from "../AccountSwitcher"; // ✅ إعادة استخدام المكون الأصلي
import { ChangePasswordModal } from "./ChangePasswordModal";

interface SettingsTabProps {
  clinicData: any;
}

type SettingsSection = "account" | "appearance" | "system";

export function SettingsTab({ clinicData }: SettingsTabProps) {
  const params = useParams();
  const router = useRouter();
  const clinicId = params?.clinicId as string;

  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

  // States
  const [autoCollapse, setAutoCollapse] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [numberingSystem, setNumberingSystem] = useState<
    "universal" | "fdi" | "palmer"
  >("universal");
  const [toothDisplayPreference, setToothDisplayPreference] = useState<
    "number" | "name" | "both"
  >("number");
  const [autoNotify, setAutoNotify] = useState(true);

  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Load Settings
  useEffect(() => {
    const savedSettings = localStorage.getItem("dashboard_settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAutoCollapse(settings.autoCollapse ?? true);
      } catch (error) {
        console.error(error);
      }
    }

    const savedNumbering = localStorage.getItem("tooth_numbering_system");
    if (savedNumbering) setNumberingSystem(savedNumbering as any);

    const savedDisplayPref = localStorage.getItem("tooth_display_preference");
    if (savedDisplayPref) setToothDisplayPreference(savedDisplayPref as any);

    const preventAutoMessages = localStorage.getItem("prevent_auto_messages");
    setAutoNotify(preventAutoMessages !== "true");
  }, []);

  // Handlers
  const handleNumberingSystemChange = (
    system: "universal" | "fdi" | "palmer",
  ) => {
    setNumberingSystem(system);
    localStorage.setItem("tooth_numbering_system", system);
    window.dispatchEvent(
      new CustomEvent("numberingSystemChanged", { detail: system }),
    );
  };

  const handleToothDisplayChange = (pref: "number" | "name" | "both") => {
    setToothDisplayPreference(pref);
    localStorage.setItem("tooth_display_preference", pref);
    window.dispatchEvent(
      new CustomEvent("toothDisplayPreferenceChanged", { detail: pref }),
    );
  };

  const handleAutoNotifyChange = (checked: boolean) => {
    setAutoNotify(checked);
    if (checked) localStorage.removeItem("prevent_auto_messages");
    else localStorage.setItem("prevent_auto_messages", "true");
    window.dispatchEvent(
      new CustomEvent("autoNotifyChanged", { detail: { enabled: checked } }),
    );
  };

  const handleAutoCollapseChange = (checked: boolean) => {
    setAutoCollapse(checked);
    localStorage.setItem(
      "dashboard_settings",
      JSON.stringify({ autoCollapse: checked }),
    );
    window.dispatchEvent(
      new CustomEvent("settingsChanged", { detail: { autoCollapse: checked } }),
    );
  };

  const handleInstallApp = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) setShowInstallPrompt(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (err) {
        console.error(err);
      }
    } else {
      window.open(url, "_blank");
    }
  };

  const primaryColor = clinicData?.settings?.primaryColor || "#0284C7";
  const clinicEmail =
    clinicData?.doctorProfile?.contactEmail ||
    clinicData?.settings?.contactEmail;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const clinicUrl = `${baseUrl}/public-clinic/${clinicId}`;
  const doctorCVUrl = `${baseUrl}/public-clinic/${clinicId}/doctor-cv`;
  const whatsappUrl = `https://wa.me/+963945299717`;

  const sections: { id: SettingsSection; label: string; icon: any }[] = [
    { id: "account", label: "الحساب والعيادة", icon: Building2 },
    { id: "appearance", label: "المظهر الطبي", icon: Palette },
    { id: "system", label: "النظام والتنبيهات", icon: Settings },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto p-4 pb-24 sm:p-6 lg:p-8"
      dir="rtl"
    >
      {/* الرأس */}
      <div className="mb-8 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-slate-100 text-slate-700 shadow-sm">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            الإعدادات
          </h1>
          
        </div>
      </div>

      {/* ✅ شريط التبويبات المحسن - تصميم مسطح ونظيف */}
      <div className="sticky top-0 z-20 py-2 mb-8 rounded-2xl bg-white">
        <div className="flex items-center justify-between relative">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "text-[#0284C7]"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 inset-x-3 h-0.5 bg-[#0284C7] rounded-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ✅ محتوى التبويب */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* ============================================================ */}
          {/* تبويب الحساب والعيادة */}
          {/* ============================================================ */}
          {activeSection === "account" && (
            <div className="space-y-6">
              {/* 1. مبدل الحسابات (المكون الأصلي) */}
              <AccountSwitcher />

              {/* 2. تثبيت التطبيق (الأولوية القصوى إذا لم يكن مثبتاً) */}
              {!isInstalled && (
                <SectionCard title=" تثبيت التطبيق" icon={Smartphone}>
                  <div className="flex items-start gap-4">
                    <div className="text-[#0284C7] shrink-0 mt-0.5">
                      <Download size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-base">
                        ثبت تطبيق LiveDent الآن
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        احصل على تجربة أسرع، إشعارات فورية، ووصول مباشر من
                        شاشتك الرئيسية دون فتح المتصفح.
                      </p>
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => setShowInstallPrompt(true)}
                          disabled={!isInstallable}
                          className="px-5 py-2 bg-[#0284C7] text-white text-sm font-semibold rounded-lg hover:bg-[#0369a1] transition-colors shadow-sm shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isInstallable
                            ? "تثبيت التطبيق"
                            : "غير متاح حالياً"}
                        </button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {/* 3. إدارة العيادة والملف */}
              <SectionCard title="إدارة العيادة" icon={Building2}>
                <div className="divide-y divide-slate-100">
                  <ActionRow
                    icon={Building2}
                    title="معلومات العيادة"
                    subtitle="البيانات الأساسية وساعات العمل"
                    onClick={() =>
                      router.push(`/dashboard/${clinicId}?tab=clinic`)
                    }
                    primaryColor={primaryColor}
                  />
                  <ActionRow
                    icon={UserCircle}
                    title="السيرة الذاتية للطبيب"
                    subtitle="تحديث المؤهلات والخبرات"
                    onClick={() => router.push(`/dashboard/${clinicId}?tab=cv`)}
                    primaryColor={primaryColor}
                  />
                </div>
              </SectionCard>

              {/* 4. روابط المشاركة */}
              <SectionCard title="روابط المشاركة" icon={Share2}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ShareButton
                    label="رابط العيادة"
                    subLabel="صفحة الحجز العامة"
                    onClick={() =>
                      handleShare(clinicUrl, clinicData?.name || "عيادتي")
                    }
                    iconColor="text-blue-600"
                    bgColor="bg-blue-50"
                  />
                  <ShareButton
                    label="السيرة الذاتية"
                    subLabel="ملف الطبيب الشخصي"
                    onClick={() => handleShare(doctorCVUrl, "طبيب")}
                    iconColor="text-indigo-600"
                    bgColor="bg-indigo-50"
                  />
                </div>
              </SectionCard>

              {/* 5. الأمان والدعم */}
              <SectionCard title="الأمان والدعم" icon={Lock}>
                <div className="divide-y divide-slate-100">
                  <ActionRow
                    icon={MessageCircle}
                    title="خدمة العملاء"
                    subtitle="تواصل معنا عبر واتساب"
                    href={whatsappUrl}
                    isExternal
                    iconColor="#25D366"
                    bgColor="bg-green-50"
                  />
                  <ActionRow
                    icon={Lock}
                    title="تغيير كلمة المرور"
                    subtitle="تحديث بيانات الدخول الأمنية"
                    onClick={() => setShowPasswordModal(true)}
                    primaryColor={primaryColor}
                  />
                  <button
                    onClick={() => {
                      /* Logout Logic */
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-red-50 transition-colors rounded-xl text-right group mt-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <LogOut size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-600">
                        تسجيل الخروج
                      </p>
                      <p className="text-xs text-red-400/80">
                        الخروج الآمن من الحساب
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-red-300 rotate-180"
                    />
                  </button>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ============================================================ */}
          {/* تبويب المظهر الطبي */}
          {/* ============================================================ */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
              <SectionCard title="نظام ترقيم الأسنان" icon={Stethoscope}>
                <div className="space-y-3">
                  {[
                    {
                      value: "universal" as const,
                      label: "النظام العالمي (Universal)",
                    },
                    { value: "fdi" as const, label: "نظام FDI" },
                    { value: "palmer" as const, label: "نظام Palmer" },
                  ].map((option) => (
                    <SelectionCard
                      key={option.value}
                      selected={numberingSystem === option.value}
                      onClick={() => handleNumberingSystemChange(option.value)}
                      primaryColor={primaryColor}
                    >
                      <span className="font-medium text-slate-800">
                        {option.label}
                      </span>
                    </SelectionCard>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="عرض معلومات الأسنان" icon={LayoutGrid}>
                <div className="space-y-3">
                  {[
                    {
                      value: "number" as const,
                      label: "الرقم فقط",
                      desc: "مثال: السن 14",
                    },
                    {
                      value: "name" as const,
                      label: "الاسم العربي",
                      desc: "مثال: الضرس الأول العلوي",
                    },
                    {
                      value: "both" as const,
                      label: "الرقم والاسم",
                      desc: "مثال: 14 - الضرس الأول",
                    },
                  ].map((option) => (
                    <SelectionCard
                      key={option.value}
                      selected={toothDisplayPreference === option.value}
                      onClick={() => handleToothDisplayChange(option.value)}
                      primaryColor={primaryColor}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-800">
                          {option.label}
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {option.desc}
                        </span>
                      </div>
                    </SelectionCard>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {/* ============================================================ */}
          {/* تبويب النظام والتنبيهات */}
          {/* ============================================================ */}
          {activeSection === "system" && (
            <div className="space-y-6">
              <SectionCard title="التنبيهات التلقائية" icon={Bell}>
                <ToggleRow
                  title="تنبيه المرضى بالمواعيد"
                  description="إرسال رسالة تلقائية عند حجز موعد جديد"
                  checked={autoNotify}
                  onChange={handleAutoNotifyChange}
                  primaryColor={primaryColor}
                />
              </SectionCard>

              <SectionCard title="سلوك الواجهة" icon={Settings}>
                <ToggleRow
                  title="إغلاق القائمة تلقائياً"
                  description="إخفاء القائمة الجانبية عند اختيار عنصر"
                  checked={autoCollapse}
                  onChange={handleAutoCollapseChange}
                  primaryColor={primaryColor}
                />
              </SectionCard>

              {isInstalled && (
                <SectionCard title="حالة التطبيق" icon={CheckCircle2}>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                    <div className="p-1.5 bg-white rounded-full text-green-600 shadow-sm">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-green-800">
                        التطبيق مثبت ونشط
                      </p>
                      <p className="text-xs text-green-600">
                        أنت تستخدم النسخة المثبتة من LiveDent
                      </p>
                    </div>
                  </div>
                </SectionCard>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        clinicId={clinicId}
        clinicName={clinicData?.name}
        clinicEmail={clinicEmail}
        primaryColor={primaryColor}
      />

      {/* PWA Install Prompt Modal */}
      {showInstallPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              تثبيت التطبيق
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              هل تريد إضافة اختصار لـ LiveDent على شاشتك الرئيسية للوصول السريع؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleInstallApp}
                disabled={isInstalling}
                className="flex-1 py-2.5 bg-[#0284C7] text-white rounded-xl font-medium hover:bg-[#0369a1] transition-colors"
              >
                {isInstalling ? "جاري..." : "تثبيت الآن"}
              </button>
              <button
                onClick={() => setShowInstallPrompt(false)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                لاحقاً
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <FooterLogos />
    </motion.div>
  );
}

// ============================================================
// مكونات مساعدة محسنة
// ============================================================

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white border border-slate-100 shadow-sm text-[#0284C7]">
            <Icon size={18} />
          </div>
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  href,
  isExternal,
  primaryColor,
  iconColor,
  bgColor,
}: any) {
  const Component = href ? "a" : "button";
  const props = href
    ? {
        href,
        target: isExternal ? "_blank" : undefined,
        rel: "noopener noreferrer",
      }
    : { onClick };

  return (
    <Component
      {...props}
      className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors rounded-xl text-right group"
    >
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${bgColor || "bg-slate-100"}`}
        style={
          !bgColor && primaryColor
            ? { backgroundColor: `${primaryColor}15`, color: primaryColor }
            : { color: iconColor }
        }
      >
        <Icon size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
      </div>
      <ChevronRight
        size={16}
        className="text-slate-300 group-hover:text-slate-500 rotate-180 shrink-0"
      />
    </Component>
  );
}

function ShareButton({ label, subLabel, onClick, iconColor, bgColor }: any) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-right group"
    >
      <div
        className={`w-9 h-9 rounded-lg ${bgColor} ${iconColor} flex items-center justify-center shrink-0`}
      >
        <Share2 size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
        <p className="text-xs text-slate-500 truncate">{subLabel}</p>
      </div>
      <ExternalLink size={14} className="text-slate-400" />
    </button>
  );
}

function SelectionCard({ selected, onClick, primaryColor, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 transition-all text-right flex items-center justify-between min-h-[44px] ${
        selected
          ? "border-[#0284C7] bg-[#F0F9FF]"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex-1">{children}</div>
      {selected && (
        <div className="ml-3 text-[#0284C7]">
          <CheckCircle2 size={20} />
        </div>
      )}
    </button>
  );
}

// ✅ ToggleRow محسن: أنحف وأنيق أكثر
function ToggleRow({
  title,
  description,
  checked,
  onChange,
  primaryColor,
}: any) {
  return (
    <div className="flex items-center justify-between gap-4 min-h-[44px]">
      <div className="flex-1">
        <label
          className="text-sm font-semibold text-slate-800 block cursor-pointer"
          onClick={() => onChange(!checked)}
        >
          {title}
        </label>
        <p className="text-xs text-slate-500 mt-1">{description}</p>
      </div>

      {/* Switch Design: Slim & Elegant */}
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ease-in-out shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0284C7]/20 ${
          checked ? "bg-[#0284C7]" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ✅ FooterLogos: استعادة الشعارات مع معالجة الأخطاء
function FooterLogos() {
  return (
    <div className="mt-12 pt-8 border-t border-slate-100">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-6 opacity-90">
          {/* تأكد من صحة المسارات هنا */}
          <div className="relative h-8 w-8">
            <Image
              src="/logo.png"
              alt="LiveDent"
              fill
              className="object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
          <div className="relative h-8 w-8">
            <Image
              src="/onrequs1t.jpg.png"
              alt="OnRequest"
              fill
              className="object-contain"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold text-slate-900">LiveDent</h3>
          <p className="text-xs text-slate-400 mt-1">
            © 2026 جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}
