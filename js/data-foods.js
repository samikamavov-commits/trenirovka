/* База продуктов: значения на 100 г.
   id — для шаблонов меню; cat — категория для фильтра. */
const FOODS = [
  // Крупы / хлеб
  {id:'oats', n:'Овсянка (сухая)', cat:'grain', k:366, p:12.3, f:6.2, c:61},
  {id:'buckwheat', n:'Гречка отварная', cat:'grain', k:110, p:4.2, f:2.2, c:21},
  {id:'rice_w', n:'Рис белый отварной', cat:'grain', k:116, p:2.2, f:0.5, c:25},
  {id:'rice_b', n:'Бурый рис отварной', cat:'grain', k:123, p:3, f:1, c:25},
  {id:'bulgur', n:'Булгур отварной', cat:'grain', k:83, p:3, f:0.2, c:19},
  {id:'pearl', n:'Перловка отварная', cat:'grain', k:109, p:3.1, f:0.4, c:22},
  {id:'pasta', n:'Макароны отварные', cat:'grain', k:135, p:4.5, f:1, c:25},
  {id:'quinoa', n:'Киноа отварная', cat:'grain', k:120, p:4.4, f:1.9, c:21},
  {id:'bread_r', n:'Хлеб ржаной', cat:'grain', k:217, p:6.6, f:1.2, c:44},
  {id:'bread_w', n:'Хлеб белый', cat:'grain', k:265, p:8, f:3, c:50},
  {id:'potato', n:'Картофель отварной', cat:'grain', k:87, p:2, f:0.1, c:19},
  {id:'sweet_pot', n:'Батат запечённый', cat:'grain', k:86, p:1.6, f:0.1, c:20},
  {id:'corn_f', n:'Кукурузные хлопья', cat:'grain', k:350, p:7, f:0.5, c:80},

  // Мясо / рыба / яйца
  {id:'chicken', n:'Куриная грудка отварная', cat:'meat', k:155, p:31, f:3, c:0},
  {id:'chicken_th', n:'Куриное бедро без кожи', cat:'meat', k:209, p:26, f:11, c:0},
  {id:'turkey', n:'Индейка филе отварная', cat:'meat', k:189, p:29, f:7, c:0},
  {id:'beef', n:'Говядина отварная', cat:'meat', k:254, p:27, f:15, c:0},
  {id:'pork', n:'Свинина отварная', cat:'meat', k:283, p:23, f:20, c:0},
  {id:'fish_cod', n:'Треска запечённая', cat:'meat', k:90, p:20, f:1, c:0},
  {id:'fish_salmon', n:'Лосось запечённый', cat:'meat', k:208, p:22, f:13, c:0},
  {id:'tuna', n:'Тунец в собственном соку', cat:'meat', k:116, p:26, f:1, c:0},
  {id:'shrimp', n:'Креветки варёные', cat:'meat', k:99, p:24, f:0.3, c:0},
  {id:'egg', n:'Яйцо варёное', cat:'meat', k:155, p:13, f:11, c:1},
  {id:'egg_white', n:'Яичный белок', cat:'meat', k:52, p:11, f:0.2, c:0.7},
  {id:'soss', n:'Колбаса варёная', cat:'meat', k:301, p:13, f:23, c:2},

  // Молочное
  {id:'cottage5', n:'Творог 5%', cat:'dairy', k:121, p:17, f:5, c:1.8},
  {id:'cottage9', n:'Творог 9%', cat:'dairy', k:159, p:18, f:9, c:3},
  {id:'milk', n:'Молоко 2,5%', cat:'dairy', k:52, p:2.9, f:2.5, c:4.8},
  {id:'kefir', n:'Кефир 1%', cat:'dairy', k:40, p:3, f:1, c:4},
  {id:'yog_greek', n:'Греческий йогурт 2%', cat:'dairy', k:73, p:10, f:2, c:3.6},
  {id:'cheese', n:'Сыр твёрдый', cat:'dairy', k:376, p:25, f:31, c:0},
  {id:'feta', n:'Фета', cat:'dairy', k:264, p:14, f:21, c:4},
  {id:'mozz', n:'Моцарелла', cat:'dairy', k:240, p:18, f:18, c:2},
  {id:'sour', n:'Сметана 20%', cat:'dairy', k:204, p:2.8, f:20, c:3.4},
  {id:'butter', n:'Масло сливочное', cat:'dairy', k:748, p:0.5, f:82, c:0.8},

  // Овощи
  {id:'cucumber', n:'Огурец', cat:'veg', k:15, p:0.7, f:0.1, c:2.8},
  {id:'tomato', n:'Помидор', cat:'veg', k:20, p:1, f:0.3, c:4},
  {id:'cabbage', n:'Капуста белокочанная', cat:'veg', k:28, p:1.8, f:0.2, c:4.7},
  {id:'broccoli', n:'Брокколи', cat:'veg', k:34, p:2.8, f:0.4, c:7},
  {id:'carrot', n:'Морковь', cat:'veg', k:32, p:1.4, f:0.1, c:6.9},
  {id:'beet', n:'Свёкла варёная', cat:'veg', k:43, p:1.7, f:0.1, c:9.6},
  {id:'pepper', n:'Перец болгарский', cat:'veg', k:27, p:1.3, f:0.1, c:5.3},
  {id:'salad', n:'Салат листовой', cat:'veg', k:15, p:1.3, f:0.1, c:2},
  {id:'zucchini', n:'Кабачок', cat:'veg', k:24, p:0.6, f:0.3, c:4.6},
  {id:'onion', n:'Лук репчатый', cat:'veg', k:41, p:1.1, f:0.1, c:9},
  {id:'spinach', n:'Шпинат', cat:'veg', k:23, p:2.9, f:0.4, c:3.6},
  {id:'corn', n:'Кукуруза консервированная', cat:'veg', k:119, p:3.4, f:1.2, c:22},
  {id:'peas', n:'Горошек зелёный', cat:'veg', k:73, p:5, f:0.5, c:14},
  {id:'mushrooms', n:'Шампиньоны', cat:'veg', k:27, p:4.3, f:1, c:0.1},
  {id:'olives', n:'Оливки', cat:'veg', k:145, p:1, f:15, c:3},

  // Фрукты
  {id:'banana', n:'Банан', cat:'fruit', k:89, p:1.1, f:0.3, c:22.8},
  {id:'apple', n:'Яблоко', cat:'fruit', k:52, p:0.4, f:0.2, c:13.8},
  {id:'orange', n:'Апельсин', cat:'fruit', k:47, p:0.9, f:0.1, c:12},
  {id:'pear', n:'Груша', cat:'fruit', k:57, p:0.4, f:0.1, c:15},
  {id:'grape', n:'Виноград', cat:'fruit', k:69, p:0.7, f:0.2, c:18},
  {id:'mandarin', n:'Мандарин', cat:'fruit', k:53, p:0.8, f:0.3, c:13},
  {id:'blueberry', n:'Черника', cat:'fruit', k:57, p:0.7, f:0.3, c:14},
  {id:'strawberry', n:'Клубника', cat:'fruit', k:32, p:0.7, f:0.3, c:7.7},
  {id:'watermelon', n:'Арбуз', cat:'fruit', k:30, p:0.6, f:0.2, c:7.6},
  {id:'avocado', n:'Авокадо', cat:'fruit', k:160, p:2, f:15, c:9},
  {id:'dates', n:'Финики', cat:'fruit', k:282, p:2.5, f:0.5, c:75},

  // Орехи / масла
  {id:'almonds', n:'Миндаль', cat:'nuts', k:579, p:21, f:50, c:22},
  {id:'walnuts', n:'Грецкий орех', cat:'nuts', k:654, p:15, f:65, c:14},
  {id:'pb', n:'Паста арахисовая', cat:'nuts', k:588, p:25, f:50, c:20},
  {id:'olive_oil', n:'Масло оливковое', cat:'nuts', k:884, p:0, f:100, c:0},
  {id:'sun_oil', n:'Масло подсолнечное', cat:'nuts', k:899, p:0, f:99.9, c:0},
  {id:'mayo', n:'Майонез', cat:'nuts', k:680, p:2.4, f:75, c:0.7},
  {id:'chia', n:'Семена чиа', cat:'nuts', k:486, p:17, f:31, c:42},
  {id:'seeds', n:'Семечки подсолнуха', cat:'nuts', k:584, p:21, f:52, c:20},

  // Бобовые
  {id:'beans', n:'Фасоль отварная', cat:'bean', k:123, p:7.8, f:0.5, c:21},
  {id:'chickpea', n:'Нут отварной', cat:'bean', k:164, p:8.9, f:2.6, c:27},
  {id:'lentil', n:'Чечевица отварная', cat:'bean', k:116, p:9, f:0.4, c:20},
  {id:'tofu', n:'Тофу', cat:'bean', k:76, p:8, f:4.8, c:1.9},
  {id:'hummus', n:'Хумус', cat:'bean', k:166, p:8, f:10, c:14},

  // Сладкое
  {id:'choc_m', n:'Шоколад молочный', cat:'sweet', k:535, p:8, f:30, c:59},
  {id:'choc_d', n:'Шоколад тёмный 70%', cat:'sweet', k:598, p:7.8, f:43, c:46},
  {id:'cookies', n:'Печенье овсяное', cat:'sweet', k:437, p:6, f:15, c:72},
  {id:'ice', n:'Мороженое пломбир', cat:'sweet', k:227, p:3.5, f:15, c:18},
  {id:'honey', n:'Мёд', cat:'sweet', k:328, p:0.3, f:0, c:80},
  {id:'sugar', n:'Сахар', cat:'sweet', k:387, p:0, f:0, c:100},
  {id:'jam', n:'Варенье', cat:'sweet', k:278, p:0.4, f:0, c:70},
  {id:'halva', n:'Халва', cat:'sweet', k:512, p:12, f:29, c:50},
  {id:'cake', n:'Торт', cat:'sweet', k:350, p:5, f:15, c:50},
  {id:'croissant', n:'Круассан', cat:'sweet', k:406, p:8, f:21, c:45},

  // Напитки
  {id:'water', n:'Вода', cat:'drink', k:0, p:0, f:0, c:0},
  {id:'coffee', n:'Кофе без сахара', cat:'drink', k:2, p:0.2, f:0, c:0.3},
  {id:'tea', n:'Чай без сахара', cat:'drink', k:1, p:0, f:0, c:0.2},
  {id:'cocoa', n:'Какао на молоке', cat:'drink', k:85, p:3, f:2, c:14},
  {id:'juice', n:'Сок апельсиновый', cat:'drink', k:45, p:0.7, f:0.2, c:10},
  {id:'cola', n:'Кола', cat:'drink', k:42, p:0, f:0, c:11},
  {id:'beer', n:'Пиво', cat:'drink', k:43, p:0.5, f:0, c:3.5},
  {id:'wine', n:'Вино красное сухое', cat:'drink', k:68, p:0.1, f:0, c:0.3},
  {id:'protein', n:'Протеин (порошок)', cat:'drink', k:380, p:75, f:5, c:8},

  // Готовые блюда
  {id:'borscht', n:'Борщ', cat:'dish', k:49, p:1.5, f:2.2, c:5},
  {id:'soup', n:'Суп куриный', cat:'dish', k:36, p:3, f:1.5, c:3},
  {id:'plov', n:'Плов с курицей', cat:'dish', k:132, p:6, f:5, c:15},
  {id:'dumplings', n:'Пельмени варёные', cat:'dish', k:245, p:11, f:8, c:32},
  {id:'pizza', n:'Пицца', cat:'dish', k:280, p:11, f:13, c:30},
  {id:'kotleta', n:'Котлета из говядины', cat:'dish', k:235, p:18, f:17, c:3},
  {id:'goluby', n:'Голубцы', cat:'dish', k:120, p:5, f:7, c:10},
  {id:'shawa', n:'Шаурма с курицей', cat:'dish', k:200, p:12, f:8, c:20},
  {id:'caesar', n:'Цезарь с курицей', cat:'dish', k:190, p:10, f:13, c:6},
  {id:'olivier', n:'Оливье', cat:'dish', k:198, p:4, f:17, c:7},
  {id:'sushi', n:'Ролл Филадельфия', cat:'dish', k:170, p:7, f:6, c:22},
  {id:'omelet', n:'Омлет на молоке', cat:'dish', k:184, p:11, f:15, c:3},
  {id:'fryegg', n:'Яичница из 2 яиц', cat:'dish', k:195, p:12, f:16, c:2},
];

const CATN = {
  grain:'Крупы/хлеб', meat:'Мясо/рыба/яйца', dairy:'Молочное', veg:'Овощи',
  fruit:'Фрукты', nuts:'Орехи/масла', bean:'Бобовые', sweet:'Сладкое',
  drink:'Напитки', dish:'Готовые блюда'
};

/* Шаблоны меню: для каждой цели — набор приёмов пищи.
   f — id из FOODS, g — граммы (базовые, потом масштабируются под норму). */
const MEAL_TEMPLATES = {
  fatloss: {
    b: {title:'Омлет + ржаной хлеб + огурец', items:[{f:'egg',g:120},{f:'bread_r',g:60},{f:'cucumber',g:80}]},
    l: {title:'Курица + гречка + свежие овощи', items:[{f:'chicken',g:180},{f:'buckwheat',g:130},{f:'cucumber',g:100},{f:'tomato',g:100},{f:'olive_oil',g:5}]},
    d: {title:'Творог + йогурт + яблоко', items:[{f:'cottage5',g:200},{f:'yog_greek',g:100},{f:'apple',g:150}]},
    s: {title:'Тунец + кефир + огурец', items:[{f:'tuna',g:120},{f:'kefir',g:250},{f:'cucumber',g:100}]}
  },
  mass: {
    b: {title:'Овсянка + молоко + банан + орехи', items:[{f:'oats',g:80},{f:'milk',g:250},{f:'banana',g:120},{f:'almonds',g:20}]},
    l: {title:'Гречка + курица + овощи с маслом', items:[{f:'buckwheat',g:220},{f:'chicken',g:200},{f:'tomato',g:100},{f:'olive_oil',g:12}]},
    d: {title:'Картофель + говядина + салат', items:[{f:'potato',g:280},{f:'beef',g:130},{f:'salad',g:80},{f:'olive_oil',g:10}]},
    s: {title:'Хлеб + арахисовая паста + молоко', items:[{f:'bread_w',g:100},{f:'pb',g:35},{f:'milk',g:250}]}
  },
  support: {
    b: {title:'Творог + банан + орехи', items:[{f:'cottage5',g:150},{f:'banana',g:100},{f:'almonds',g:15}]},
    l: {title:'Бурый рис + индейка + брокколи', items:[{f:'rice_b',g:180},{f:'turkey',g:160},{f:'broccoli',g:150},{f:'olive_oil',g:8}]},
    d: {title:'Лосось + овощи', items:[{f:'fish_salmon',g:150},{f:'broccoli',g:180},{f:'sweet_pot',g:150}]},
    s: {title:'Кефир + груша + чёрный шоколад', items:[{f:'kefir',g:250},{f:'pear',g:130},{f:'choc_d',g:20}]}
  }
};

window.Foods = {
  list: FOODS,
  byId(id){ return FOODS.find(x => x.id === id) || null; },
  searchLocal(q, limit){
    q = q.trim().toLowerCase();
    if (q.length < 2) return [];
    return FOODS.filter(x => x.n.toLowerCase().includes(q)).slice(0, limit || 8);
  }
};
