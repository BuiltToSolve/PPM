/**
 * Utility to download an array of objects or rows as a CSV file in the browser.
 */
export function downloadCSV(filename, rows) {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return false;
  }

  const separator = ',';
  const keys = Object.keys(rows[0]);

  const csvContent = [
    keys.join(separator),
    ...rows.map((row) =>
      keys
        .map((k) => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell instanceof Date ? cell.toLocaleString() : cell.toString();
          cell = cell.replace(/"/g, '""');
          if (cell.search(/("|,|\n|\r)/g) >= 0) {
            cell = `"${cell}"`;
          }
          return cell;
        })
        .join(separator)
    ),
  ].join('\r\n');

  try {
    // Prefix with UTF-8 BOM (\uFEFF) so Excel, Numbers, and Google Sheets parse UTF-8 encoding properly
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 150);
    return true;
  } catch (err) {
    console.error('Error generating CSV download', err);
    return false;
  }
}
