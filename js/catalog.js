// Categorías e imágenes locales: el catálogo no depende de servicios externos.
export const categories = ['Impresión', 'Diseño', 'Instalación', 'Mantenimiento', 'Otros'];
export const categoryIcons = {'Impresión':'▤', 'Diseño':'◇', 'Instalación':'⌘', 'Mantenimiento':'⚙', 'Otros':'▦'};
const images = ['impresion', 'diseno', 'instalacion', 'mantenimiento', 'otros'];
export function categoryOf(product) {
  return categories.includes(product.category) ? product.category : 'Otros';
}
export function imageOf(product) {
  return `./images/${images[categories.indexOf(categoryOf(product))]}.svg`;
}
export function filterProducts(products, search, category) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const term = normalize(search.trim());
  return products.filter(p => (category === 'Todos' || categoryOf(p) === category) && normalize(`${p.name} ${categoryOf(p)} ${p.type}`).includes(term));
}
