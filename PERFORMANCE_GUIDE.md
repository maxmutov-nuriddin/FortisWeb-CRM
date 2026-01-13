# Performance Optimization Guide
## Как использовать оптимизации для больших данных

> **ВАЖНО**: Эти утилиты НЕ МЕНЯЮТ существующий код!  
> Они добавляют ДОПОЛНИТЕЛЬНЫЕ возможности для оптимизации.

---

## 🚀 Быстрый старт

### 1. Pagination (Пагинация)

**Проблема**: Таблица с 10,000 строк тормозит  
**Решение**: Показывать по 50 строк на странице

```javascript
import { usePagination } from '../hooks/usePerformance';

const MyTable = () => {
  const allData = [...]; // 10,000 элементов
  
  const {
    paginatedData,
    currentPage,
    totalPages,
    nextPage,
    prevPage
  } = usePagination(allData, 50);

  return (
    <div>
      <table>
        {paginatedData.map(item => <tr key={item.id}>...</tr>)}
      </table>
      
      <button onClick={prevPage}>Previous</button>
      <span>{currentPage} / {totalPages}</span>
      <button onClick={nextPage}>Next</button>
    </div>
  );
};
```

---

### 2. Debounce (Задержка поиска)

**Проблема**: Поиск вызывается при каждом символе  
**Решение**: Ждать 300ms после последнего ввода

```javascript
import { useDebounce } from '../hooks/usePerformance';

const SearchComponent = () => {
  const [query, setQuery] = useState('');
  
  const debouncedSearch = useDebounce((value) => {
    // Этот код выполнится только через 300ms после последнего ввода
    fetchSearchResults(value);
  }, 300);

  return (
    <input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        debouncedSearch(e.target.value);
      }}
    />
  );
};
```

---

### 3. Virtual Scroll (Виртуальный скролл)

**Проблема**: Список из 5,000 элементов тормозит  
**Решение**: Рендерить только видимые элементы

```javascript
import { useVirtualScroll } from '../hooks/usePerformance';

const LargeList = ({ items }) => {
  const {
    visibleItems,
    totalHeight,
    handleScroll
  } = useVirtualScroll(items, 50, 600);

  return (
    <div
      style={{ height: 600, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(item => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: item.top,
              height: 50,
              width: '100%'
            }}
          >
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 4. Lazy Loading (Ленивая загрузка)

**Проблема**: Загружается сразу 10,000 элементов  
**Решение**: Загружать по 50 при скролле

```javascript
import { useLazyLoad } from '../hooks/usePerformance';

const InfiniteScroll = ({ allData }) => {
  const { visibleData, loadMore, hasMore } = useLazyLoad(allData, 50);

  return (
    <div>
      {visibleData.map(item => <div key={item.id}>{item.name}</div>)}
      
      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  );
};
```

---

### 5. Memoization (Кэширование вычислений)

**Проблема**: Тяжелые вычисления при каждом рендере  
**Решение**: Кэшировать результаты

```javascript
import { memoize } from '../utils/dataOptimization';

// Тяжелая функция
const expensiveCalculation = (data) => {
  return data.reduce((sum, item) => sum + item.value, 0);
};

// Кэшированная версия
const memoizedCalculation = memoize(expensiveCalculation);

// Теперь повторные вызовы с теми же данными мгновенные!
const result1 = memoizedCalculation(bigData); // Медленно (первый раз)
const result2 = memoizedCalculation(bigData); // Мгновенно (из кэша)
```

---

### 6. Batch Processing (Пакетная обработка)

**Проблема**: Обработка 10,000 элементов блокирует UI  
**Решение**: Обрабатывать по 100 элементов с паузами

```javascript
import { useChunkProcessor } from '../hooks/usePerformance';

const DataProcessor = () => {
  const { processInChunks } = useChunkProcessor();
  
  const handleProcess = async () => {
    const results = await processInChunks(
      largeDataset,
      async (item) => {
        // Обработка одного элемента
        return await processItem(item);
      },
      100 // Размер порции
    );
    
    console.log('All processed!', results);
  };

  return <button onClick={handleProcess}>Process Data</button>;
};
```

---

## 📊 Примеры использования в реальных компонентах

### Оптимизация таблицы Payments

```javascript
// БЫЛО (медленно с 1000+ платежами):
const Payments = () => {
  const { payments } = usePaymentStore();
  
  return (
    <table>
      {payments.map(p => <PaymentRow key={p.id} payment={p} />)}
    </table>
  );
};

// СТАЛО (быстро):
import { usePagination } from '../hooks/usePerformance';

const Payments = () => {
  const { payments } = usePaymentStore();
  const { paginatedData, currentPage, totalPages, goToPage } = 
    usePagination(payments, 50);
  
  return (
    <>
      <table>
        {paginatedData.map(p => <PaymentRow key={p.id} payment={p} />)}
      </table>
      <Pagination current={currentPage} total={totalPages} onChange={goToPage} />
    </>
  );
};
```

---

### Оптимизация поиска Projects

```javascript
// БЫЛО (поиск при каждом символе):
const Projects = () => {
  const [search, setSearch] = useState('');
  const { projects } = useProjectStore();
  
  const filtered = projects.filter(p => 
    p.title.includes(search)
  );
  
  return (
    <>
      <input value={search} onChange={e => setSearch(e.target.value)} />
      {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
    </>
  );
};

// СТАЛО (поиск через 300ms после ввода):
import { useDebounce } from '../hooks/usePerformance';

const Projects = () => {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { projects } = useProjectStore();
  
  const handleSearch = useDebounce((value) => {
    setDebouncedSearch(value);
  }, 300);
  
  const filtered = projects.filter(p => 
    p.title.includes(debouncedSearch)
  );
  
  return (
    <>
      <input 
        value={search} 
        onChange={e => {
          setSearch(e.target.value);
          handleSearch(e.target.value);
        }} 
      />
      {filtered.map(p => <ProjectCard key={p.id} project={p} />)}
    </>
  );
};
```

---

## 🎯 Когда использовать что

| Проблема | Решение | Когда использовать |
|----------|---------|-------------------|
| Много строк в таблице | `usePagination` | > 100 элементов |
| Очень длинный список | `useVirtualScroll` | > 1000 элементов |
| Поиск тормозит | `useDebounce` | Любой поиск |
| Скролл лагает | `useThrottle` | Scroll events |
| Тяжелые вычисления | `memoize` | Повторяющиеся вычисления |
| Массовая обработка | `processInChunks` | > 1000 операций |
| Бесконечный скролл | `useLazyLoad` | Социальные ленты |

---

## ⚡ Чек-лист оптимизации

- [ ] Таблицы с > 50 строк используют пагинацию
- [ ] Поиск использует debounce
- [ ] Списки с > 1000 элементов используют virtual scroll
- [ ] Тяжелые вычисления мемоизированы
- [ ] Массовые операции разбиты на порции
- [ ] Scroll events используют throttle

---

## 🚨 Важно!

**НЕ НУЖНО** менять существующий код!  
Эти утилиты - **ДОПОЛНИТЕЛЬНЫЕ**.  
Используйте их только там, где есть проблемы с производительностью.

**Рабочий код остается нетронутым!** ✅
