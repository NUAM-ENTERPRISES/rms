import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { projectNames } from "../data/mockData";

type ProjectSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function ProjectSelector({ value, onChange }: ProjectSelectorProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px] h-9 text-sm">
        <SelectValue placeholder="Select Project" />
      </SelectTrigger>
      <SelectContent>
        {projectNames.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
