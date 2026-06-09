# Buscaminas (React + Vite)

SPA de Buscaminas con tablero configurable, minas aleatorias, revelar celdas, contador de minas/banderas y reinicio.

## Requisitos
- Node.js 18+ recomendado

## Ejecutar en desarrollo
```bash
npm install
npm run dev
```

La app se sirve en `http://localhost:3000`.

## Controles
- Click: revelar
- Right click: marcar/desmarcar bandera
- Doble click sobre número revelado: despeje (si las banderas alrededor coinciden con el número)
