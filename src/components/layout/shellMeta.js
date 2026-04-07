const DEFAULT_META = Object.freeze({
  section: 'پنل مدیریت',
  title: 'نمای کلی سیستم',
  description: 'مهم ترین عملیات و ورودی های هر بخش را از اینجا دنبال کنید.',
})

const PAGE_META = [
  { match: (pathname) => pathname === '/', section: 'خانه', title: 'دید کلی عملیات', description: 'میانبرها، وضعیت های روزانه و ورود سریع به مسیرهای پرتکرار.' },
  { match: (pathname) => pathname === '/orders', section: 'فروش', title: 'میزکار سفارشات', description: 'ثبت، پیگیری، آرشیو و بررسی پرداخت سفارش ها در یک سطح کاری.' },
  { match: (pathname) => pathname === '/orders/new', section: 'فروش', title: 'ثبت سفارش جدید', description: 'جریان سریع ثبت سفارش با تمرکز روی کمترین جابه جایی اپراتور.' },
  { match: (pathname) => pathname.startsWith('/orders/'), section: 'فروش', title: 'جزئیات سفارش', description: 'وضعیت، اقلام، پیوست ها و پرداخت ها را در یک نما مدیریت کنید.' },
  { match: (pathname) => pathname === '/customers', section: 'مشتریان', title: 'دایرکتوری مشتریان', description: 'جستجو، وضعیت، پروژه ها و اطلاعات تکمیلی مشتریان.' },
  { match: (pathname) => pathname === '/inventory', section: 'انبار', title: 'میزکار انبار', description: 'کاتالوگ، عملیات، موجودی و تنظیمات انبار با پیمایش چندسطحی.' },
  { match: (pathname) => pathname === '/accounting', section: 'حسابداری', title: 'میزکار مالی', description: 'اسناد، حساب ها، گزارش ها و تنظیمات در یک ساختار قابل پیش بینی.' },
  { match: (pathname) => pathname === '/human-resources', section: 'منابع انسانی', title: 'دایرکتوری پرسنل', description: 'ثبت، آرشیو و مدیریت اطلاعات و مدارک پرسنل.' },
  { match: (pathname) => pathname.startsWith('/master-data/profile'), section: 'اطلاعات پایه', title: 'پروفایل کسب و کار', description: 'هویت برند و اطلاعات مرجع نمایش داده شده در سیستم را نگه دارید.' },
  { match: (pathname) => pathname.startsWith('/master-data/pricing'), section: 'اطلاعات پایه', title: 'قیمت گذاری', description: 'قواعد قیمت، محدودیت ها و تنظیمات پایه فروش را مدیریت کنید.' },
  { match: (pathname) => pathname.startsWith('/master-data'), section: 'اطلاعات پایه', title: 'تنظیمات مرجع', description: 'تنظیمات پایه ای که روی چندین ماژول اثر می گذارند.' },
  { match: (pathname) => pathname === '/users-access' || pathname === '/users', section: 'امنیت و دسترسی', title: 'کاربران و دسترسی', description: 'نقش ها، مجوزها و وضعیت کاربران فعال سیستم.' },
  { match: (pathname) => pathname.startsWith('/management'), section: 'امنیت و دسترسی', title: 'ممیزی فعالیت ها', description: 'ثبت رویدادها و تغییرات حساس را برای پیگیری بازبینی کنید.' },
  { match: (pathname) => pathname.startsWith('/owner'), section: 'پیکربندی پیشرفته', title: 'اتاق فرمان ERP', description: 'فعال سازی ماژول ها و تنظیمات سطح مالکیت سیستم.' },
]

export const getShellPageMeta = (pathname = '') => {
  const normalizedPath = String(pathname || '').trim()
  return PAGE_META.find((entry) => entry.match(normalizedPath)) || DEFAULT_META
}
