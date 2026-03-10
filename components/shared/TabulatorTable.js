'use client';

import { useEffect, useRef } from 'react';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator_simple.css';

/**
 * Thin React wrapper around Tabulator.
 *
 * Props:
 *   columns  — Tabulator column defs
 *   data     — array of row objects
 *   options  — extra Tabulator options (merged)
 *   height   — css height string (default '500px')
 */
export default function TabulatorTable({ columns, data, options = {}, height = '500px' }) {
  const ref = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    tableRef.current = new Tabulator(ref.current, {
      data,
      columns,
      layout: 'fitDataFill',
      responsiveLayout: 'hide',
      pagination: true,
      paginationSize: 20,
      paginationSizeSelector: [10, 20, 50, 100],
      movableColumns: false,
      placeholder: 'No data found.',
      height,
      ...options,
    });

    return () => {
      tableRef.current?.destroy();
      tableRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data reactively without re-creating table
  useEffect(() => {
    if (tableRef.current && data) {
      tableRef.current.replaceData(data);
    }
  }, [data]);

  return <div ref={ref} />;
}
