import { FastifyInstance } from 'fastify';
import { clientService } from '../services/client.service';
import { z } from 'zod';

// Esquemas de validação para as rotas
const CreateClientBodySchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email deve ter formato válido'),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const UpdateClientBodySchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional(),
  email: z.string().email('Email deve ter formato válido').optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export default async function (app: FastifyInstance) {
  // Listar todos os clientes
  app.get(
    '/clients',
    {
      schema: {
        summary: 'Lista todos os clientes',
        description: 'Retorna uma lista de todos os clientes cadastrados',
        tags: ['Clientes'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                email: { type: 'string' },
                phone: { type: 'string', nullable: true },
                address: { type: 'string', nullable: true },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          500: {
            type: 'object',
            description: 'Erro interno do servidor',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Erro ao listar clientes' },
            },
          },
        },
      },
    },
    async (_, reply) => {
      try {
        const clients = await clientService.getClients();
        return reply.status(200).send(clients);
      } catch (error) {
        console.error('Erro ao listar clientes:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro interno ao listar clientes',
        });
      }
    }
  );

  // Obter cliente por ID
  app.get<{ Params: { id: string } }>(
    '/clients/:id',
    {
      schema: {
        summary: 'Obtém um cliente por ID',
        description: 'Retorna os dados de um cliente específico',
        tags: ['Clientes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string', nullable: true },
              address: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            description: 'Cliente não encontrado',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Cliente não encontrado' },
            },
          },
          500: {
            type: 'object',
            description: 'Erro interno do servidor',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Erro ao obter cliente' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const client = await clientService.getClient(parseInt(id));

        if (!client) {
          return reply.status(404).send({
            status: 'error',
            message: 'Cliente não encontrado',
          });
        }

        return reply.status(200).send(client);
      } catch (error) {
        console.error('Erro ao obter cliente:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro interno ao obter cliente',
        });
      }
    }
  );

  // Criar novo cliente
  app.post<{
    Body: z.infer<typeof CreateClientBodySchema>;
  }>(
    '/clients',
    {
      schema: {
        summary: 'Cria um novo cliente',
        description: 'Cadastra um novo cliente no sistema',
        tags: ['Clientes'],
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: {
              type: 'string',
              description: 'Nome completo do cliente',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email único do cliente',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Telefone do cliente',
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Endereço do cliente',
            },
            isActive: {
              type: 'boolean',
              description: 'Status ativo do cliente',
              default: true,
            },
          },
        },
        response: {
          201: {
            type: 'object',
            description: 'Cliente criado com sucesso',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string', nullable: true },
              address: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            type: 'object',
            description: 'Dados inválidos',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Dados inválidos' },
              errors: { type: 'array' },
            },
          },
          500: {
            type: 'object',
            description: 'Erro interno do servidor',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Erro ao criar cliente' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        // Validar dados de entrada
        const body = CreateClientBodySchema.parse(request.body);

        // Criar cliente
        const client = await clientService.createClient(body);

        return reply.status(201).send(client);
      } catch (error) {
        // Tratar erros de validação do Zod
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }

        console.error('Erro ao criar cliente:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro interno ao criar cliente',
        });
      }
    }
  );

  // Atualizar cliente
  app.put<{
    Params: { id: string };
    Body: z.infer<typeof UpdateClientBodySchema>;
  }>(
    '/clients/:id',
    {
      schema: {
        summary: 'Atualiza um cliente',
        description: 'Atualiza os dados de um cliente existente',
        tags: ['Clientes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Nome completo do cliente',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email único do cliente',
            },
            phone: {
              type: 'string',
              nullable: true,
              description: 'Telefone do cliente',
            },
            address: {
              type: 'string',
              nullable: true,
              description: 'Endereço do cliente',
            },
            isActive: {
              type: 'boolean',
              description: 'Status ativo do cliente',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            description: 'Cliente atualizado com sucesso',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string', nullable: true },
              address: { type: 'string', nullable: true },
              isActive: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          404: {
            type: 'object',
            description: 'Cliente não encontrado',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Cliente não encontrado' },
            },
          },
          500: {
            type: 'object',
            description: 'Erro interno do servidor',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Erro ao atualizar cliente' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Validar dados de entrada
        const body = UpdateClientBodySchema.parse(request.body);

        // Verificar se o cliente existe
        const existingClient = await clientService.getClient(parseInt(id));
        if (!existingClient) {
          return reply.status(404).send({
            status: 'error',
            message: 'Cliente não encontrado',
          });
        }

        // Atualizar cliente
        const client = await clientService.updateClient(parseInt(id), body);

        return reply.status(200).send(client);
      } catch (error) {
        // Tratar erros de validação do Zod
        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            status: 'error',
            message: 'Dados inválidos',
            errors: error.errors,
          });
        }

        console.error('Erro ao atualizar cliente:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro interno ao atualizar cliente',
        });
      }
    }
  );

  // Deletar cliente
  app.delete<{ Params: { id: string } }>(
    '/clients/:id',
    {
      schema: {
        summary: 'Deleta um cliente',
        description: 'Remove um cliente do sistema',
        tags: ['Clientes'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string', pattern: '^\\d+$' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            description: 'Cliente deletado com sucesso',
            properties: {
              id: { type: 'number' },
              deleted: { type: 'boolean', default: true },
            },
          },
          404: {
            type: 'object',
            description: 'Cliente não encontrado',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Cliente não encontrado' },
            },
          },
          500: {
            type: 'object',
            description: 'Erro interno do servidor',
            properties: {
              status: { type: 'string', default: 'error' },
              message: { type: 'string', default: 'Erro ao deletar cliente' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Verificar se o cliente existe
        const existingClient = await clientService.getClient(parseInt(id));
        if (!existingClient) {
          return reply.status(404).send({
            status: 'error',
            message: 'Cliente não encontrado',
          });
        }

        // Deletar cliente
        const result = await clientService.deleteClient(parseInt(id));

        return reply.status(200).send(result);
      } catch (error) {
        console.error('Erro ao deletar cliente:', error);
        return reply.status(500).send({
          status: 'error',
          message: 'Erro interno ao deletar cliente',
        });
      }
    }
  );
}
