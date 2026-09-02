import { Check, Chrome, Copy, Phone, Smartphone } from "lucide-react";
import { useState, type MouseEvent, type ReactNode } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatPhoneDisplay,
  getDesktopCallPlatform,
  getGoogleChromeCallHint,
  getLinkedPhoneCallHint,
  supportsNativeTelDialer,
  usesDirectTelLink,
  toGoogleChromeCallHref,
  toTelHref,
  toWhatsAppHref,
  type DesktopCallPlatform,
  type PhoneLinkParts,
} from "@/lib/phone-links";
import { cn } from "@/lib/utils";

type DesktopCallMenuContentProps = {
  phoneDisplay: string | null;
  whatsappHref: string | null;
  googleChromeHref: string | null;
  telHref: string;
  platform: DesktopCallPlatform;
  copied: boolean;
  onCopy: () => void;
  onCallSelect?: () => void;
  onClose: () => void;
};

function DesktopCallMenuContent({
  phoneDisplay,
  whatsappHref,
  googleChromeHref,
  telHref,
  platform,
  copied,
  onCopy,
  onCallSelect,
  onClose,
}: DesktopCallMenuContentProps) {
  const linkedPhoneHint = getLinkedPhoneCallHint(platform);
  const googleChromeHint = getGoogleChromeCallHint(platform);

  const handleCallSelect = () => {
    onClose();
    onCallSelect?.();
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Call candidate
        </p>
        <p className="mt-1 text-sm font-semibold text-foreground">
          {phoneDisplay}
        </p>
      </div>

      <div className="space-y-1.5">
        {googleChromeHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start gap-2 border-blue-200 bg-blue-50/50 hover:bg-blue-50"
          >
            <a
              href={googleChromeHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCallSelect}
            >
              <Chrome className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Call via Google Chrome
            </a>
          </Button>
        ) : null}

        {whatsappHref ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start gap-2"
          >
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleCallSelect}
            >
              <FaWhatsapp className="h-4 w-4 text-green-600" aria-hidden="true" />
              Call via WhatsApp
            </a>
          </Button>
        ) : null}

        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 w-full justify-start gap-2"
        >
          <a href={telHref} onClick={handleCallSelect}>
            <Smartphone className="h-4 w-4" aria-hidden="true" />
            Call via linked phone
          </a>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full justify-start gap-2"
          onClick={onCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy number"}
        </Button>
      </div>

      <div className="space-y-1 text-xs leading-relaxed text-muted-foreground">
        {googleChromeHref ? <p>{googleChromeHint}</p> : null}
        <p>{linkedPhoneHint}</p>
      </div>
    </div>
  );
}

export type PhoneCallButtonProps = {
  parts: PhoneLinkParts;
  className?: string;
  disabledClassName?: string;
  stopPropagation?: boolean;
  testId?: string;
  title?: string;
  ariaLabel?: string;
  children?: ReactNode;
  onCallSelect?: () => void;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

export function PhoneCallButton({
  parts,
  className,
  disabledClassName,
  stopPropagation = false,
  testId = "candidate-call-btn",
  title = "Call",
  ariaLabel = "Call",
  children,
  onCallSelect,
  variant = "ghost",
  size = "sm",
}: PhoneCallButtonProps) {
  const telHref = toTelHref(parts);
  const whatsappHref = toWhatsAppHref(parts);
  const googleChromeHref = toGoogleChromeCallHref(parts);
  const phoneDisplay = formatPhoneDisplay(parts);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTriggerClick = (event: MouseEvent) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
  };

  if (!telHref) {
    return (
      <Button
        variant={variant}
        size={size}
        data-testid={testId}
        className={cn(disabledClassName ?? className)}
        disabled
        title={title}
        aria-label={ariaLabel}
      >
        {children ?? <Phone className="h-4 w-4" aria-hidden="true" />}
      </Button>
    );
  }

  if (usesDirectTelLink()) {
    return (
      <Button
        asChild
        variant={variant}
        size={size}
        data-testid={testId}
        className={className}
        title={title}
      >
        <a
          href={telHref}
          aria-label={ariaLabel}
          onClick={(event) => {
            handleTriggerClick(event);
            onCallSelect?.();
          }}
        >
          {children ?? (
            <>
              <span className="sr-only">{ariaLabel}</span>
              <Phone className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </a>
      </Button>
    );
  }

  const platform = getDesktopCallPlatform();

  const copyPhoneNumber = async () => {
    const digits = telHref.replace(/^tel:\+?/, "+");
    await navigator.clipboard.writeText(digits);
    setCopied(true);
    toast.success("Phone number copied");
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          data-testid={testId}
          className={className}
          title={title}
          aria-label={ariaLabel}
          onClick={handleTriggerClick}
        >
          {children ?? (
            <>
              <span className="sr-only">{ariaLabel}</span>
              <Phone className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3"
        align="start"
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
        }}
      >
        <DesktopCallMenuContent
          phoneDisplay={phoneDisplay}
          whatsappHref={whatsappHref}
          googleChromeHref={googleChromeHref}
          telHref={telHref}
          platform={platform}
          copied={copied}
          onCopy={() => void copyPhoneNumber()}
          onCallSelect={onCallSelect}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}

export type PhoneCallLinkProps = {
  parts: PhoneLinkParts;
  className?: string;
  children: ReactNode;
  stopPropagation?: boolean;
  onCallSelect?: () => void;
};

/** Inline phone link — uses native tel: on mobile, call menu on desktop. */
export function PhoneCallLink({
  parts,
  className,
  children,
  stopPropagation = false,
  onCallSelect,
}: PhoneCallLinkProps) {
  const telHref = toTelHref(parts);
  const whatsappHref = toWhatsAppHref(parts);
  const googleChromeHref = toGoogleChromeCallHref(parts);
  const phoneDisplay = formatPhoneDisplay(parts);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!telHref) {
    return <span className={className}>{children}</span>;
  }

  if (usesDirectTelLink()) {
    return (
      <a
        href={telHref}
        className={className}
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
          onCallSelect?.();
        }}
      >
        {children}
      </a>
    );
  }

  const platform = getDesktopCallPlatform();

  const copyPhoneNumber = async () => {
    const digits = telHref.replace(/^tel:\+?/, "+");
    await navigator.clipboard.writeText(digits);
    setCopied(true);
    toast.success("Phone number copied");
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn("cursor-pointer text-left", className)}
          onClick={(event) => {
            if (stopPropagation) {
              event.stopPropagation();
            }
          }}
        >
          {children}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-3"
        align="start"
        onClick={(event) => {
          if (stopPropagation) {
            event.stopPropagation();
          }
        }}
      >
        <DesktopCallMenuContent
          phoneDisplay={phoneDisplay}
          whatsappHref={whatsappHref}
          googleChromeHref={googleChromeHref}
          telHref={telHref}
          platform={platform}
          copied={copied}
          onCopy={() => void copyPhoneNumber()}
          onCallSelect={onCallSelect}
          onClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
}
