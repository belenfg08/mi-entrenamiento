/* Alimentos comunes con valores APROXIMADOS por 100 g (kcal y proteína en g),
   tomados de tablas generales de composición de alimentos. Varían según marca,
   receta y preparación: sirven como referencia rápida, no como dato exacto.
   porcion: gramos de una porción típica, para rellenar la cantidad. */
window.ALIMENTOS = [
  // Panes y cereales
  { nombre: 'Marraqueta', kcal: 270, prot: 8.5, porcion: 100 },
  { nombre: 'Hallulla', kcal: 300, prot: 8, porcion: 90 },
  { nombre: 'Pan integral de molde (rebanada)', kcal: 250, prot: 10, porcion: 30 },
  { nombre: 'Avena', kcal: 389, prot: 16.9, porcion: 40 },
  { nombre: 'Arroz blanco cocido', kcal: 130, prot: 2.7, porcion: 150 },
  { nombre: 'Fideos cocidos', kcal: 158, prot: 5.8, porcion: 180 },
  { nombre: 'Papa cocida', kcal: 87, prot: 1.9, porcion: 150 },
  // Legumbres
  { nombre: 'Porotos cocidos', kcal: 127, prot: 8.7, porcion: 180 },
  { nombre: 'Lentejas cocidas', kcal: 116, prot: 9, porcion: 180 },
  { nombre: 'Garbanzos cocidos', kcal: 164, prot: 8.9, porcion: 150 },
  // Proteínas
  { nombre: 'Huevo entero (1 unidad)', kcal: 143, prot: 12.6, porcion: 50 },
  { nombre: 'Clara de huevo', kcal: 52, prot: 11, porcion: 33 },
  { nombre: 'Pechuga de pollo cocida', kcal: 165, prot: 31, porcion: 150 },
  { nombre: 'Carne de vacuno magra cocida', kcal: 220, prot: 27, porcion: 150 },
  { nombre: 'Salmón cocido', kcal: 206, prot: 22, porcion: 150 },
  { nombre: 'Atún en agua (escurrido)', kcal: 116, prot: 26, porcion: 80 },
  { nombre: 'Jamón de pavo (lámina)', kcal: 110, prot: 17, porcion: 20 },
  { nombre: 'Tofu firme', kcal: 144, prot: 15, porcion: 100 },
  { nombre: 'Proteína whey en polvo', kcal: 400, prot: 80, porcion: 30 },
  // Lácteos
  { nombre: 'Leche entera (vaso)', kcal: 61, prot: 3.2, porcion: 200 },
  { nombre: 'Leche descremada (vaso)', kcal: 35, prot: 3.4, porcion: 200 },
  { nombre: 'Yogur natural', kcal: 61, prot: 3.5, porcion: 125 },
  { nombre: 'Yogur griego natural', kcal: 97, prot: 9, porcion: 150 },
  { nombre: 'Quesillo', kcal: 100, prot: 12, porcion: 50 },
  { nombre: 'Queso mantecoso o gauda', kcal: 356, prot: 25, porcion: 30 },
  // Frutas y verduras
  { nombre: 'Palta', kcal: 160, prot: 2, porcion: 50 },
  { nombre: 'Plátano', kcal: 89, prot: 1.1, porcion: 120 },
  { nombre: 'Manzana', kcal: 52, prot: 0.3, porcion: 150 },
  { nombre: 'Naranja', kcal: 47, prot: 0.9, porcion: 150 },
  { nombre: 'Frutillas', kcal: 32, prot: 0.7, porcion: 150 },
  { nombre: 'Tomate', kcal: 18, prot: 0.9, porcion: 120 },
  { nombre: 'Lechuga', kcal: 15, prot: 1.4, porcion: 50 },
  { nombre: 'Zanahoria', kcal: 41, prot: 0.9, porcion: 80 },
  { nombre: 'Brócoli cocido', kcal: 35, prot: 2.4, porcion: 100 },
  // Grasas, frutos secos y otros
  { nombre: 'Aceite de oliva (cucharada)', kcal: 884, prot: 0, porcion: 13 },
  { nombre: 'Mantequilla de maní (cucharada)', kcal: 588, prot: 25, porcion: 16 },
  { nombre: 'Almendras', kcal: 579, prot: 21, porcion: 30 },
  { nombre: 'Nueces', kcal: 654, prot: 15, porcion: 30 },
  { nombre: 'Azúcar (cucharadita)', kcal: 387, prot: 0, porcion: 5 },
  { nombre: 'Mermelada', kcal: 250, prot: 0.4, porcion: 20 },
  { nombre: 'Bebida cola (lata)', kcal: 42, prot: 0, porcion: 350 }
];
