// src/routes/staff-users.routes.ts
import { Router } from 'express';
import { StaffUsersController } from '../controllers/staff/staff-users.controller';

const router = Router();
const controller = new StaffUsersController();

// 🔍 Autocomplete para "Buscar Colaborador por RUT / Nombre"
router.get('/staff/users/search', (req, res, next) =>
  controller.search(req, res, next),
);

// 📋 Perfiles de staff por sucursal (para el select de Perfil)
router.get('/staff/profiles', (req, res, next) =>
  controller.getProfiles(req, res, next),
);

// 📄 Detalle de un usuario (para cargar formulario al seleccionar en buscador)
router.get('/staff/users/:id', (req, res, next) =>
  controller.getById(req, res, next),
);

// ➕ Crear nuevo colaborador
router.post('/staff/users', (req, res, next) =>
  controller.create(req, res, next),
);

// ✏️ Editar colaborador existente
router.put('/staff/users/:id', (req, res, next) =>
  controller.update(req, res, next),
);

export default router;
