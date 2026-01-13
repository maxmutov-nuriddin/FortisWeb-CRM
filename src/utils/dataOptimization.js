/**
 * Data Optimization Utilities
 * Утилиты для оптимизации работы с большими данными
 * ДОПОЛНИТЕЛЬНЫЕ функции - НЕ меняют существующий код
 */

/**
 * Memoize function results - кэширует результаты функций
 */
export const memoize = (fn) => {
   const cache = new Map();

   return (...args) => {
      const key = JSON.stringify(args);

      if (cache.has(key)) {
         return cache.get(key);
      }

      const result = fn(...args);
      cache.set(key, result);

      // Ограничиваем размер кэша
      if (cache.size > 100) {
         const firstKey = cache.keys().next().value;
         cache.delete(firstKey);
      }

      return result;
   };
};

/**
 * Debounce function - задерживает выполнение
 */
export const debounce = (fn, delay = 300) => {
   let timeoutId;

   return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
   };
};

/**
 * Throttle function - ограничивает частоту вызовов
 */
export const throttle = (fn, delay = 300) => {
   let lastCall = 0;

   return (...args) => {
      const now = Date.now();

      if (now - lastCall >= delay) {
         lastCall = now;
         return fn(...args);
      }
   };
};

/**
 * Chunk array - разбивает массив на части
 */
export const chunkArray = (array, size = 50) => {
   const chunks = [];
   for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
   }
   return chunks;
};

/**
 * Process in batches - обрабатывает данные порциями
 */
export const processBatches = async (items, processFn, batchSize = 100, delay = 0) => {
   const results = [];
   const batches = chunkArray(items, batchSize);

   for (const batch of batches) {
      const batchResults = await Promise.all(batch.map(processFn));
      results.push(...batchResults);

      if (delay > 0) {
         await new Promise(resolve => setTimeout(resolve, delay));
      }
   }

   return results;
};

/**
 * Deep clone object - глубокое копирование
 */
export const deepClone = (obj) => {
   if (obj === null || typeof obj !== 'object') return obj;
   if (obj instanceof Date) return new Date(obj);
   if (obj instanceof Array) return obj.map(item => deepClone(item));

   const clonedObj = {};
   for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
         clonedObj[key] = deepClone(obj[key]);
      }
   }
   return clonedObj;
};

/**
 * Filter large dataset efficiently
 */
export const efficientFilter = (array, predicate, maxResults = 1000) => {
   const results = [];

   for (let i = 0; i < array.length && results.length < maxResults; i++) {
      if (predicate(array[i])) {
         results.push(array[i]);
      }
   }

   return results;
};

/**
 * Sort large dataset efficiently
 */
export const efficientSort = (array, compareFn) => {
   // Для больших массивов используем более эффективную сортировку
   if (array.length > 10000) {
      return [...array].sort(compareFn);
   }
   return array.sort(compareFn);
};

/**
 * Search in large dataset
 */
export const binarySearch = (sortedArray, target, compareFn) => {
   let left = 0;
   let right = sortedArray.length - 1;

   while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const comparison = compareFn(sortedArray[mid], target);

      if (comparison === 0) return mid;
      if (comparison < 0) left = mid + 1;
      else right = mid - 1;
   }

   return -1;
};

/**
 * Remove duplicates efficiently
 */
export const removeDuplicates = (array, keyFn = item => item) => {
   const seen = new Set();
   return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
   });
};

/**
 * Group by key efficiently
 */
export const groupBy = (array, keyFn) => {
   return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
         groups[key] = [];
      }
      groups[key].push(item);
      return groups;
   }, {});
};

/**
 * Flatten nested array
 */
export const flattenArray = (array, depth = Infinity) => {
   if (depth === 0) return array;

   return array.reduce((flat, item) => {
      if (Array.isArray(item)) {
         flat.push(...flattenArray(item, depth - 1));
      } else {
         flat.push(item);
      }
      return flat;
   }, []);
};

/**
 * Measure performance
 */
export const measurePerformance = (fn, label = 'Operation') => {
   return (...args) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();

      console.log(`${label} took ${(end - start).toFixed(2)}ms`);

      return result;
   };
};

/**
 * Cache with expiration
 */
export class CacheWithExpiry {
   constructor(ttl = 60000) { // 1 minute default
      this.cache = new Map();
      this.ttl = ttl;
   }

   set(key, value) {
      this.cache.set(key, {
         value,
         expiry: Date.now() + this.ttl
      });
   }

   get(key) {
      const item = this.cache.get(key);

      if (!item) return null;

      if (Date.now() > item.expiry) {
         this.cache.delete(key);
         return null;
      }

      return item.value;
   }

   clear() {
      this.cache.clear();
   }

   cleanup() {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
         if (now > item.expiry) {
            this.cache.delete(key);
         }
      }
   }
}

export default {
   memoize,
   debounce,
   throttle,
   chunkArray,
   processBatches,
   deepClone,
   efficientFilter,
   efficientSort,
   binarySearch,
   removeDuplicates,
   groupBy,
   flattenArray,
   measurePerformance,
   CacheWithExpiry
};
