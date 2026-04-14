/**
 * icons.jsx — Mapeamento centralizado de ícones Lucide.
 * Uso: <Icon name="BarChart3" size={16} /> ou Icon({ name: "BarChart3" })
 */
import {
  BarChart3, Newspaper, Calendar, Trophy, Camera, FileText, Building2,
  Users, Settings, Image, Globe, Link2, Layers, MapPin, ChevronLeft,
  Search, X, Eye, Edit, Trash2, Plus, Check, AlertTriangle, Clock,
  Lock, Unlock, Star, Upload, Download, File, Folder, ExternalLink,
  Mail, Phone, MessageSquare, Send, ChevronDown, ChevronRight, Menu,
  Filter, RefreshCw, Save, Copy, Share2, Tag, Bookmark, Heart,
  Shield, Scale, Flag, Award, Medal, Megaphone, Bell, Info,
  Grid, List, CalendarDays, FileSpreadsheet, Printer, CreditCard,
  Banknote, PiggyBank, Receipt, Wallet, CircleDollarSign,
  UserCheck, UserX, UserPlus, UserCog,
  FolderOpen, FileUp, FilePlus, FileCheck, FileX, FileSearch,
  ClipboardList, ClipboardCheck, Clipboard,
  MapPinned, Map, Navigation, Route,
  Activity, TrendingUp, PieChart, BarChart,
  Home, LogOut, LogIn, Key, Fingerprint,
  Pencil, SquarePen, CircleCheck, CircleX, CircleAlert, CircleMinus,
  Hash, AtSign, Smartphone, Monitor,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  ChevronUp, ChevronsUpDown,
  MoreHorizontal, MoreVertical, Ellipsis,
  Zap, Flame, Sparkles,
  GraduationCap, BookOpen, FileQuestion,
  Handshake, BadgeCheck, ShieldCheck,
  LayoutDashboard, PanelLeft, Table2, CalendarCheck, ListChecks, History, DollarSign,
  ImagePlus, Images, GalleryVertical,
  Video, Play, Pause,
  Ruler, Mountain, TreePine, Footprints,
  Timer, Hourglass, CalendarClock,
  Building, Landmark, School,
  Package, Archive, Box,
  Paintbrush, Palette,
  Vote, ScrollText, Gavel,
  PersonStanding, Shirt,
} from "lucide-react";

const ICON_MAP = {
  // Layout & Navigation
  LayoutDashboard, Home, Menu, PanelLeft,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown,
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown,
  MoreHorizontal, MoreVertical, Ellipsis,
  Grid, List, Table2,

  // Content
  Newspaper, FileText, File, Folder, FolderOpen,
  FileUp, FilePlus, FileCheck, FileX, FileSearch, FileSpreadsheet, FileQuestion,
  ClipboardList, ClipboardCheck, Clipboard, ScrollText, ListChecks,
  BookOpen, GraduationCap,

  // Media
  Camera, Image, ImagePlus, Images, GalleryVertical,
  Video, Play, Pause,

  // People
  User, Users, UserCheck, UserX, UserPlus, UserCog,
  PersonStanding, Shirt,

  // Communication
  Mail, Phone, MessageSquare, Send, Bell, Megaphone,

  // Actions
  Search, X, Eye, Edit, Pencil, SquarePen,
  Trash2, Plus, Check, Save, Copy, Share2, Download, Upload,
  RefreshCw, Filter, Printer, ExternalLink, Link2,
  Lock, Unlock, Key, Fingerprint, LogIn, LogOut,

  // Status
  CircleCheck, CircleX, CircleAlert, CircleMinus,
  AlertTriangle, Info, Shield, ShieldCheck, BadgeCheck,
  Star, Bookmark, Heart, Flag, Tag,

  // Sports & Events
  Trophy, Award, Medal,
  Calendar, CalendarDays, CalendarCheck, CalendarClock,
  Activity, Zap, Flame, Sparkles,
  Mountain, TreePine, Footprints, Route, Ruler,
  PersonStanding, Timer, Hourglass,

  // Location
  MapPin, MapPinned, Map, Navigation, Globe,

  // Finance
  CreditCard, Banknote, PiggyBank, Receipt, Wallet, CircleDollarSign, DollarSign,

  // Charts
  BarChart3, BarChart, PieChart, TrendingUp,

  // Buildings
  Building, Building2, Landmark, School,

  // Other
  Settings, Layers, Package, Archive, Box,
  Paintbrush, Palette, Vote, Gavel, Scale, Handshake,
  Clock, History, Hash, AtSign, Smartphone, Monitor,
};

export default function Icon({ name, size = 16, color, strokeWidth = 2, className, style, ...props }) {
  const C = ICON_MAP[name];
  if (!C) return null;
  return <C size={size} color={color} strokeWidth={strokeWidth} className={className} style={style} {...props} />;
}

// Re-export para uso direto quando necessário
export { ICON_MAP };
