import { Card } from '@/components/shared/ui'

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-black text-slate-900 border-b border-slate-100 pb-1">{title}</div>
      <div className="space-y-1.5 text-xs font-bold text-slate-600 leading-relaxed">{children}</div>
    </div>
  )
}

function Item({ label, children }) {
  return (
    <div>
      <span className="font-black text-slate-800">{label}: </span>
      {children}
    </div>
  )
}

export function HelpPanel() {
  return (
    <div className="space-y-4" dir="rtl">
      <Card padding="md" className="space-y-5">
        <div>
          <div className="text-base font-black text-slate-900">راهنمای ماژول حسابداری</div>
          <div className="text-xs font-bold text-slate-500 mt-0.5">
            سیستم حسابداری دوطرفه (Double-Entry) بر اساس سرفصل‌های استاندارد ایران
          </div>
        </div>

        <Section title="مفاهیم پایه">
          <Item label="سند حسابداری (Voucher)">
            هر رویداد مالی باید به صورت یک سند با حداقل دو آرتیکل ثبت شود — جمع ستون بدهکار باید برابر با جمع ستون بستانکار باشد.
          </Item>
          <Item label="سرفصل حساب‌ها (Chart of Accounts)">
            ساختار سه‌سطحی: گروه ← کل ← معین. حساب‌های سطح معین (آخرین سطح) قابل استفاده در آرتیکل‌های سند هستند.
          </Item>
          <Item label="سال مالی">
            هر سند باید به یک سال مالی باز تعلق داشته باشد. بعد از بستن سال مالی امکان ثبت سند جدید در آن وجود ندارد.
          </Item>
          <Item label="وضعیت سند">
            سند ابتدا به صورت «پیش‌نویس» ذخیره می‌شود و بعد از تأیید «ثبت» می‌شود. سند ثبت‌شده غیرقابل ویرایش است.
          </Item>
        </Section>

        <Section title="گردش کار (Workflow)">
          <div className="rounded-lg bg-slate-50 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-white">۱</span>
              <span>در تب <span className="font-black text-slate-800">تنظیمات</span>، یک سال مالی ایجاد کنید.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-white">۲</span>
              <span>در تب <span className="font-black text-slate-800">سرفصل حساب‌ها</span> ساختار را بررسی و در صورت نیاز ویرایش کنید.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-white">۳</span>
              <span>در تب <span className="font-black text-slate-800">اسناد</span>، اسناد حسابداری ثبت کنید یا از پل فروش استفاده کنید.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-black text-white">۴</span>
              <span>از تب‌های گزارش (<span className="font-black text-slate-800">تراز آزمایشی، دفتر کل</span> و ...) برای تحلیل استفاده کنید.</span>
            </div>
          </div>
        </Section>

        <Section title="تب‌های ماژول">
          <Item label="اسناد">ثبت، ویرایش و مدیریت اسناد حسابداری. امکان پیش‌نویس، ثبت نهایی و ابطال.</Item>
          <Item label="سرفصل حساب‌ها">نمایش و مدیریت درخت حساب‌ها. غیرفعال/فعال‌کردن حساب و تغییر وضعیت قابل استفاده در آرتیکل.</Item>
          <Item label="تراز آزمایشی">خلاصه گردش تمام حساب‌ها در یک سال مالی — تأیید تعادل بدهکار/بستانکار.</Item>
          <Item label="دفتر کل">گردش ریز تراکنش‌های یک حساب خاص با مانده روان.</Item>
          <Item label="مانده مشتریان">مانده حساب دریافتنی به تفکیک مشتری.</Item>
          <Item label="درآمد/هزینه">خلاصه درآمدها و هزینه‌ها و سود/زیان خالص.</Item>
          <Item label="پل فروش">
            همگام‌سازی خودکار پرداخت‌های ثبت‌شده در ماژول فروش به اسناد حسابداری.
            ایده‌مپوتنت است — هر پرداخت فقط یک‌بار سند ایجاد می‌کند.
          </Item>
          <Item label="تنظیمات">مدیریت سال‌های مالی، تنظیم حساب‌های پل فروش و فعال/غیرفعال‌کردن تب‌ها.</Item>
        </Section>

        <Section title="پل فروش — نکات مهم">
          <div>قبل از اجرای پل فروش، در بخش تنظیمات پل فروش حساب‌های زیر را مشخص کنید:</div>
          <div className="rounded-lg bg-amber-50 p-3 space-y-1">
            <div><span className="font-black text-amber-800">صندوق:</span> برای پرداخت‌های نقدی</div>
            <div><span className="font-black text-amber-800">بانک:</span> برای پرداخت‌های کارت/حواله</div>
            <div><span className="font-black text-amber-800">اسناد دریافتنی:</span> برای چک‌های دریافتی</div>
            <div><span className="font-black text-amber-800">دریافتنی تجاری (AR):</span> برای مانده بدهی مشتری</div>
          </div>
        </Section>

        <Section title="سؤالات متداول">
          <Item label="آیا می‌توان سند ثبت‌شده را ویرایش کرد؟">
            خیر. سند ثبت‌شده (Posted) قابل ویرایش نیست. در صورت اشتباه، سند را ابطال کنید و سند جدید ثبت کنید.
          </Item>
          <Item label="شماره‌گذاری اسناد چگونه است؟">
            شماره‌گذاری به ازای هر سال مالی از ۱ شروع می‌شود و بدون شکاف پیش می‌رود (الزام حسابرسی).
          </Item>
          <Item label="واحد مبالغ چیست؟">
            تمام مبالغ به ریال و بدون اعشار ذخیره می‌شوند.
          </Item>
          <Item label="آیا می‌توان سرفصل‌های جدید اضافه کرد؟">
            بله. از تب «سرفصل حساب‌ها» می‌توانید حساب‌های جدید در سه سطح گروه، کل و معین اضافه کنید.
          </Item>
        </Section>
      </Card>
    </div>
  )
}
