import { Card } from '@/components/shared/ui'

const FLOW_STEPS = [
  {
    title: '1. ساختار انبار را تعریف کنید',
    body: 'از تب تنظیمات شروع کنید. اول انبارها را بسازید، بعد مکان‌های داخل هر انبار را تعریف کنید. بدون این دو، عملیات انبار مقصد و مبدا مشخصی نخواهد داشت و ثبت موجودی معنی‌دار نمی‌شود.',
  },
  {
    title: '2. کالاها را ثبت کنید',
    body: 'در تب کالاها، محصولات را تعریف کنید. هر محصول مشخص می‌کند چه چیزی وارد یا خارج می‌شود و واحد شمارش آن چیست. اگر یک قلم را باید جدا از سری ساخت، تاریخ انقضا، یا بچ تولید دنبال کنید، برایش سری هم تعریف می‌کنید.',
  },
  {
    title: '3. موجودی اولیه را وارد کنید',
    body: 'برای اینکه سیستم از صفر بداند چه چیزی در هر انبار هست، معمولاً با یک رسید اولیه شروع می‌کنید. رسید موجودی را به انبار و مکان مقصد وارد می‌کند و از همان لحظه گزارش‌ها قابل استفاده می‌شوند.',
  },
  {
    title: '4. عملیات روزانه را ثبت کنید',
    body: 'بعد از راه‌اندازی اولیه، کار اصلی در تب عملیات انجام می‌شود: رسید برای ورود، حواله برای خروج، انتقال برای جابجایی، تعدیل برای اصلاح، شمارش برای اختلاف موجودی، و عملیات تولید برای مصرف مواد یا ثبت خروجی.',
  },
  {
    title: '5. عملیات را تا انتها جلو ببرید',
    body: 'هر عملیات اول به شکل پیش‌نویس ثبت می‌شود. بعد ارسال می‌شود، در صورت نیاز تایید می‌شود، و در نهایت ثبت نهایی می‌گردد. اثر واقعی روی موجودی فقط در مرحله ثبت نهایی اعمال می‌شود.',
  },
  {
    title: '6. نتیجه را کنترل کنید',
    body: 'از تب موجودی و گزارش‌ها استفاده کنید تا موجودی فعلی، کارتکس، و وضعیت کلی عملیات را ببینید. اگر برای بعضی کالاها کف و سقف موجودی مهم است، از تامین مجدد برای تعریف rule استفاده کنید.',
  },
]

const SECTION_PURPOSES = [
  {
    title: 'تنظیمات',
    body: 'این بخش پایه فیزیکی سیستم است. انبار و مکان تعیین می‌کند کالا دقیقاً کجاست. اگر این لایه شفاف نباشد، گزارش موجودی فقط عدد می‌دهد ولی معلوم نیست آن عدد مربوط به کدام فضای واقعی است.',
  },
  {
    title: 'کالاها',
    body: 'این بخش هویت اقلام را نگه می‌دارد. محصول می‌گوید با چه قلمی طرف هستیم؛ سری کمک می‌کند همان قلم را در سری‌های متفاوت از هم جدا کنیم.',
  },
  {
    title: 'عملیات',
    body: 'این بخش موتور اصلی انبار است. موجودی نباید مستقیم و دستی بالا و پایین شود؛ باید از مسیر عملیات تغییر کند تا بعداً معلوم باشد چه کسی، چه زمانی، چرا، و با کدام سند موجودی را تغییر داده است.',
  },
  {
    title: 'موجودی و گزارش‌ها',
    body: 'این بخش برای مشاهده و تصمیم‌گیری است. اینجا نتیجه عملیات را می‌بینید، نه اینکه منطق انبار را دور بزنید. اگر موجودی اشتباه است، معمولاً باید از تب عملیات آن را اصلاح کنید.',
  },
]

const LOT_GUIDE = [
  'سری زمانی لازم است که یک محصول را فقط به‌عنوان یک نام کلی نبینید و لازم باشد سری‌های مختلف آن را جداگانه رهگیری کنید.',
  'نمونه‌های رایج: مواد یا کالاهای دارای تاریخ انقضا، بچ تولید، شماره سری ساخت، یا بارهایی که کیفیت و منشا متفاوت دارند.',
  'اگر برای شما مهم است بدانید کدام سری وارد شد، کدام سری مصرف شد، یا کدام سری باید زودتر خارج شود، تعریف سری لازم است.',
  'اگر محصول برای شما فقط یک قلم ساده و یکنواخت است و تفاوت سری‌ها اهمیتی ندارد، تعریف سری ضروری نیست و فقط پیچیدگی اضافه می‌آورد.',
]

const IMPORTANT_RULES = [
  'پیش‌نویس فقط آماده‌سازی است و هنوز موجودی را تغییر نمی‌دهد.',
  'فقط عملیات تاییدشده قابل ثبت نهایی است.',
  'بعد از ثبت نهایی، عملیات برگشت‌پذیر نیست؛ برای اصلاح باید عملیات جبرانی یا تعدیل ثبت شود.',
  'رزرو در سیستم وجود دارد اما فعلاً مدیریت دستی آن در UI عمومی نمایش داده نمی‌شود.',
]

export const InventoryHelpPanel = () => (
  <div className="space-y-4" dir="rtl">
    <Card padding="md" className="space-y-4">
      <section className="space-y-3">
        <h2 className="text-base font-black text-slate-900">از اول تا آخر با این ماژول چطور کار کنیم؟</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {FLOW_STEPS.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">{step.body}</p>
            </article>
          ))}
        </div>
      </section>
    </Card>

    <Card padding="md" className="space-y-4">
      <section className="space-y-3">
        <h2 className="text-base font-black text-slate-900">ضرورت هر بخش چیست؟</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {SECTION_PURPOSES.map((section) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-black text-slate-900">{section.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-700">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </Card>

    <Card padding="md" className="space-y-4">
      <section className="space-y-3">
        <h2 className="text-base font-black text-slate-900">سری دقیقاً چه زمانی لازم است؟</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
          {LOT_GUIDE.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    </Card>

    <Card padding="md" className="space-y-4">
      <section className="space-y-3">
        <h2 className="text-base font-black text-slate-900">قاعده‌های مهمی که باید یادت بماند</h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
          {IMPORTANT_RULES.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>
    </Card>
  </div>
)
