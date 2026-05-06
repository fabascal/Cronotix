import {
  MessageSquare,
  Zap,
  Link2,
  BarChart2,
  Shield,
  Cloud,
} from "lucide-react";

interface IconProps {
  className?: string;
}

const Icons = {
  ChatBubbleLeftRightIcon: ({ className }: IconProps) => (
    <MessageSquare className={className} />
  ),
  VaadinAutomationIcon: ({ className }: IconProps) => (
    <Zap className={className} />
  ),
  GrommetIconsIntegration: ({ className }: IconProps) => (
    <Link2 className={className} />
  ),
  ChartBarIcon: ({ className }: IconProps) => (
    <BarChart2 className={className} />
  ),
  ShieldCheckIcon: ({ className }: IconProps) => (
    <Shield className={className} />
  ),
  CloudArrowUpIcon: ({ className }: IconProps) => (
    <Cloud className={className} />
  ),
};

export default Icons;
