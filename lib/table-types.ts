import type React from 'react';

export interface TableColumnDef {
  id: string;
  label: string | React.ReactNode;
  isAnchor?: boolean;
  alwaysVisible?: boolean;
  defaultHidden?: boolean;
  tooltip?: string;
  sortable?: boolean;
}
