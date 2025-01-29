export const formatter = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  export const safeFormat = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return formatter.format(value);
  };
  
  export const formatterVol = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  export const safeFormatVol = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) {
      return 'N/A';
    }
    return formatterVol.format(value);
  }; 