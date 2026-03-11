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
  const ref            = useRef(null);
  const tableRef       = useRef(null);
  const tableReadyRef  = useRef(false);
  // Holds data that arrived before tableBuilt fired
  const pendingDataRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    tableReadyRef.current  = false;
    pendingDataRef.current = null;

    tableRef.current = new Tabulator(ref.current, {
      data: data ?? [],
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
      tableBuilt() {
        tableReadyRef.current = true;
        // Apply any data update that arrived before the table was ready
        if (pendingDataRef.current !== null) {
          tableRef.current.replaceData(pendingDataRef.current);
          pendingDataRef.current = null;
        }
      },
    });

    return () => {
      tableReadyRef.current  = false;
      pendingDataRef.current = null;
      tableRef.current?.destroy();
      tableRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reactively sync data into the table after creation
  useEffect(() => {
    if (!data) return;

    if (tableRef.current && tableReadyRef.current) {
      // Table is ready — update immediately
      tableRef.current.replaceData(data);
    } else {
      // Table still initialising — queue the update for tableBuilt
      pendingDataRef.current = data;
    }
  }, [data]);

  return <div ref={ref} />;
}
