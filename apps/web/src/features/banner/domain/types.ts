export interface BannerItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string;
  linkUrl: string;
  badge: string | null;
  target: "_self" | "_blank";
  order: number;
  isActive: boolean;
  shadingOpacity?: number;
  shadingPosition?: "left" | "right" | "bottom" | "full";
  createdAt: string;
  updatedAt: string;
}

export interface BannerInput {
  title?: string;
  description?: string | null;
  imageUrl: string;
  linkUrl: string;
  badge?: string | null;
  target?: "_self" | "_blank";
  order?: number;
  isActive?: boolean;
  shadingOpacity?: number;
  shadingPosition?: "left" | "right" | "bottom" | "full";
}

