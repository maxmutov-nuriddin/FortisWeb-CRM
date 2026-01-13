import { useMemo, useCallback, useRef } from 'react';

/**
 * Performance Optimization Utilities
 * Дополнительные утилиты для работы с большими данными
 * НЕ МЕНЯЕТ существующий код - только добавляет новые возможности
 */

/**
 * Debounce hook - предотвращает частые вызовы функций
 * Используйте для поиска, фильтрации и т.д.
 */
export const useDebounce = (callback, delay = 300) => {
   const timeoutRef = useRef(null);

   const debouncedCallback = useCallback((...args) => {
      if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
         callback(...args);
      }, delay);
   }, [callback, delay]);

   return debouncedCallback;
};

/**
 * Throttle hook - ограничивает частоту вызовов
 * Используйте для scroll events, resize и т.д.
 */
export const useThrottle = (callback, delay = 300) => {
   const lastRunRef = useRef(Date.now());

   const throttledCallback = useCallback((...args) => {
      const now = Date.now();

      if (now - lastRunRef.current >= delay) {
         callback(...args);
         lastRunRef.current = now;
      }
   }, [callback, delay]);

   return throttledCallback;
};

/**
 * Pagination hook - разбивает большие массивы на страницы
 * Используйте для таблиц с большим количеством данных
 */
export const usePagination = (data = [], itemsPerPage = 50) => {
   const [currentPage, setCurrentPage] = React.useState(1);

   const totalPages = Math.ceil(data.length / itemsPerPage);

   const paginatedData = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      return data.slice(startIndex, endIndex);
   }, [data, currentPage, itemsPerPage]);

   const goToPage = useCallback((page) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
   }, [totalPages]);

   const nextPage = useCallback(() => {
      goToPage(currentPage + 1);
   }, [currentPage, goToPage]);

   const prevPage = useCallback(() => {
      goToPage(currentPage - 1);
   }, [currentPage, goToPage]);

   return {
      paginatedData,
      currentPage,
      totalPages,
      goToPage,
      nextPage,
      prevPage,
      hasNext: currentPage < totalPages,
      hasPrev: currentPage > 1
   };
};

/**
 * Lazy loading hook - загружает данные по мере необходимости
 * Используйте для бесконечного скролла
 */
export const useLazyLoad = (data = [], batchSize = 50) => {
   const [loadedCount, setLoadedCount] = React.useState(batchSize);

   const visibleData = useMemo(() => {
      return data.slice(0, loadedCount);
   }, [data, loadedCount]);

   const loadMore = useCallback(() => {
      setLoadedCount(prev => Math.min(prev + batchSize, data.length));
   }, [data.length, batchSize]);

   const hasMore = loadedCount < data.length;

   return {
      visibleData,
      loadMore,
      hasMore,
      loadedCount,
      totalCount: data.length
   };
};

/**
 * Memoization hook - кэширует результаты вычислений
 * Используйте для тяжелых вычислений
 */
export const useMemoizedComputation = (computeFn, dependencies) => {
   return useMemo(() => {
      const startTime = performance.now();
      const result = computeFn();
      const endTime = performance.now();

      if (endTime - startTime > 100) {
         console.warn(`Slow computation detected: ${endTime - startTime}ms`);
      }

      return result;
   }, dependencies);
};

/**
 * Batch update hook - группирует множественные обновления
 * Используйте для массовых операций
 */
export const useBatchUpdate = (updateFn, delay = 100) => {
   const batchRef = useRef([]);
   const timeoutRef = useRef(null);

   const addToBatch = useCallback((item) => {
      batchRef.current.push(item);

      if (timeoutRef.current) {
         clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
         if (batchRef.current.length > 0) {
            updateFn(batchRef.current);
            batchRef.current = [];
         }
      }, delay);
   }, [updateFn, delay]);

   return addToBatch;
};

/**
 * Virtual scroll helper - для отображения только видимых элементов
 * Используйте для очень длинных списков (1000+ элементов)
 */
export const useVirtualScroll = (items = [], itemHeight = 50, containerHeight = 600) => {
   const [scrollTop, setScrollTop] = React.useState(0);

   const visibleRange = useMemo(() => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);

      return {
         start: Math.max(0, startIndex - 5), // Buffer
         end: Math.min(items.length, endIndex + 5) // Buffer
      };
   }, [scrollTop, itemHeight, containerHeight, items.length]);

   const visibleItems = useMemo(() => {
      return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
         ...item,
         index: visibleRange.start + index,
         top: (visibleRange.start + index) * itemHeight
      }));
   }, [items, visibleRange, itemHeight]);

   const totalHeight = items.length * itemHeight;

   const handleScroll = useCallback((e) => {
      setScrollTop(e.target.scrollTop);
   }, []);

   return {
      visibleItems,
      totalHeight,
      handleScroll,
      visibleRange
   };
};

/**
 * Chunk processing - обрабатывает большие массивы частями
 * Предотвращает блокировку UI
 */
export const useChunkProcessor = () => {
   const processInChunks = useCallback(async (items, processFn, chunkSize = 100) => {
      const results = [];

      for (let i = 0; i < items.length; i += chunkSize) {
         const chunk = items.slice(i, i + chunkSize);
         const chunkResults = await Promise.all(chunk.map(processFn));
         results.push(...chunkResults);

         // Даем браузеру время на обновление UI
         await new Promise(resolve => setTimeout(resolve, 0));
      }

      return results;
   }, []);

   return { processInChunks };
};

export default {
   useDebounce,
   useThrottle,
   usePagination,
   useLazyLoad,
   useMemoizedComputation,
   useBatchUpdate,
   useVirtualScroll,
   useChunkProcessor
};
