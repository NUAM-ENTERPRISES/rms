import {
  Activity,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  ClipboardList,
  Globe,
  Plane,
  Shield,
  Stamp,
  Stethoscope,
  Ticket,
} from "lucide-react";
import {
  PROCESSING_STEP_KEYS,
  ProcessingStepKey,
  ProcessingStepStatus,
} from "../types";

export type ProcessingStepMeta = {
  key: ProcessingStepKey;
  title: string;
  description: string;
  icon: typeof Activity;
  accent: string;
  defaultSlaDays: number;
  lottie: string;
  allowNotApplicable?: boolean;
};

export const PROCESSING_STEP_META: ProcessingStepMeta[] = [
  {
    key: "MEDICAL_CERTIFICATE",
    title: "Medical Certificate",
    description: "Collect latest fit-to-travel certificate.",
    icon: Stethoscope,
    accent: "from-emerald-500/20 to-emerald-500/10",
    defaultSlaDays: 5,
    lottie:
      "https://lottie.host/bf4f1e62-3ffb-4806-8e84-486b3c352269/JP9DEo63HU.json",
  },
  {
    key: "DOCUMENT_COLLECTION",
    title: "Original Document Check",
    description: "Verify all originals in person.",
    icon: ClipboardList,
    accent: "from-blue-500/20 to-blue-500/10",
    defaultSlaDays: 7,
    lottie:
      "https://lottie.host/9d3e78de-62b1-45e5-b5da-4e98c024aaa0/6Qh0gij8Io.json",
  },
  {
    key: "HRD_ATTESTATION",
    title: "HRD Attestation",
    description: "Complete home-country HRD attestation.",
    icon: Stamp,
    accent: "from-purple-500/20 to-purple-500/10",
    defaultSlaDays: 20,
    lottie:
      "https://lottie.host/65ada7c2-3403-4d57-a7a3-7d12e4210042/2TBI91tO3F.json",
  },
  {
    key: "QVP",
    title: "QVP Accreditation",
    description: "Saudi MHRSD qualification verification.",
    icon: Shield,
    accent: "from-indigo-500/20 to-indigo-500/10",
    defaultSlaDays: 15,
    allowNotApplicable: true,
    lottie:
      "https://lottie.host/11275f8c-fc0a-443e-99bb-b172b8ca0d24/dQG5a7OuMI.json",
  },
  {
    key: "DATAFLOW",
    title: "DataFlow Verification",
    description: "Primary source verification where mandated.",
    icon: Activity,
    accent: "from-pink-500/20 to-pink-500/10",
    defaultSlaDays: 30,
    allowNotApplicable: true,
    lottie:
      "https://lottie.host/0a3d798f-93de-4830-bd7d-85b40fb2a644/oLY2gLw5zW.json",
  },
  {
    key: "PROMETRIC",
    title: "Prometric Exam",
    description: "Schedule & clear the licensing exam.",
    icon: BadgeCheck,
    accent: "from-amber-500/20 to-amber-500/10",
    defaultSlaDays: 10,
    allowNotApplicable: true,
    lottie:
      "https://lottie.host/76fb6bbc-e105-4143-b76b-f9acd14509d3/XKtwAoaRz6.json",
  },
  {
    key: "VISA",
    title: "Visa Processing",
    description: "Submit visa documents & track approvals.",
    icon: Globe,
    accent: "from-cyan-500/20 to-cyan-500/10",
    defaultSlaDays: 25,
    lottie:
      "https://lottie.host/4dd11f8c-e13a-4c1f-8775-7183762c5086/1pHxx_Z7XQ.json",
  },
  {
    key: "IMMIGRATION",
    title: "Immigration Clearance",
    description: "Complete MOFA / emigration clearance.",
    icon: Briefcase,
    accent: "from-rose-500/20 to-rose-500/10",
    defaultSlaDays: 7,
    lottie:
      "https://lottie.host/4f1df2dc-f9d2-4b28-8d4e-7db443ef1611/1pJFYQWcjy.json",
  },
  {
    key: "TICKETING",
    title: "Ticketing",
    description: "Book outbound tickets aligned with client schedule.",
    icon: Ticket,
    accent: "from-lime-500/20 to-lime-500/10",
    defaultSlaDays: 3,
    lottie:
      "https://lottie.host/ea339177-04f1-4e8f-81ed-eafe1d466df9/TgXb2ymlpU.json",
  },
  {
    key: "TRAVEL",
    title: "Travel & Arrival",
    description: "Confirm travel completion and pickup logistics.",
    icon: Plane,
    accent: "from-sky-500/20 to-sky-500/10",
    defaultSlaDays: 2,
    lottie:
      "https://lottie.host/598fc4a7-53a4-4f02-ae37-9c547fbd5efd/UDMS6wBW4E.json",
  },
  {
    key: "JOINING",
    title: "Joining Confirmation",
    description: "Capture Day-1 confirmation & onboarding notes.",
    icon: CheckCircle2,
    accent: "from-emerald-500/20 to-emerald-500/10",
    defaultSlaDays: 7,
    lottie:
      "https://lottie.host/49c00a70-8509-4b0b-9d2d-70b7777209c1/6ZVcVEWWyP.json",
  },
];

export const PROCESSING_STEP_META_MAP = PROCESSING_STEP_META.reduce(
  (acc, meta) => {
    acc[meta.key] = meta;
    return acc;
  },
  {} as Record<ProcessingStepKey, ProcessingStepMeta>
);

export const PROCESSING_STEP_STATUS_META: Record<
  ProcessingStepStatus,
  { label: string; badge: string }
> = {
  PENDING: { label: "Pending", badge: "bg-slate-100 text-slate-700" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-blue-100 text-blue-700" },
  DONE: { label: "Done", badge: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Rejected", badge: "bg-rose-100 text-rose-700" },
  NOT_APPLICABLE: {
    label: "Not Applicable",
    badge: "bg-amber-100 text-amber-700",
  },
};

export const PROCESSING_STEP_STATUS_ORDER: ProcessingStepStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "DONE",
  "REJECTED",
  "NOT_APPLICABLE",
];

export const getProcessingStepMeta = (key: ProcessingStepKey) =>
  PROCESSING_STEP_META_MAP[key];
