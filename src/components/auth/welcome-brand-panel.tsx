export function WelcomeBrandPanel() {
  return (
    <div className="welcome-brand-panel relative flex w-full shrink-0 flex-col justify-between overflow-hidden p-6 pb-8 text-[#EAF2F0] sm:p-8 sm:pb-10 lg:min-h-[100dvh] lg:w-[44%] lg:p-14 lg:pb-12 xl:min-w-[460px]">
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(234,242,240,0.55)]">
            <div className="relative h-[14px] w-[14px] rounded-full border-2 border-[#EAF2F0]">
              <div className="absolute -top-[3px] left-1/2 h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#D98BB5]" />
            </div>
          </div>
          <div className="font-mono-data text-[11px] font-medium tracking-[0.3em] text-[rgba(234,242,240,0.82)]">
            GYN-ONC REGISTRY
          </div>
        </div>
        <div className="mt-6 text-[11px] font-medium tracking-[0.32em] text-[#D98BB5] uppercase">
          Clinical Data Platform
        </div>
      </div>

      <div className="relative my-6 lg:my-0">
        <h1 className="font-display mb-4 max-w-[14ch] text-[38px] leading-[1.08] font-medium tracking-tight sm:text-[44px] lg:mb-5 xl:text-[50px]">
          Gynaecological Oncology Registry
        </h1>
        <p className="max-w-[40ch] text-[15px] leading-relaxed text-[rgba(234,242,240,0.74)] sm:text-[16.5px]">
          A structured registry for patient care at Parirenyatwa — register cases, complete modules, and export data when you need it.
        </p>
      </div>

      <div className="relative text-[11px] text-[rgba(234,242,240,0.55)] sm:text-xs">
        Secure · Audit-logged · Role-based
      </div>
    </div>
  );
}
