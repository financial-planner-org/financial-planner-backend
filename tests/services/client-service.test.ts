import { clientService } from '../../src/services/client.service';
import { prisma } from '../setup';

describe('Serviço de Clientes - Lógica de Negócio', () => {
  beforeEach(async () => {
    // Limpar banco de dados
    await prisma.client.deleteMany({});
  });

  afterEach(async () => {
    // Limpar dados após cada teste
    await prisma.client.deleteMany({});
  });

  describe('createClient - Criar Cliente', () => {
    it('deve criar um cliente com dados válidos', async () => {
      // Arrange
      const clientData = {
        name: 'João Silva',
        email: 'joao.silva@exemplo.com',
        phone: '+55 11 99999-9999',
        address: 'Rua das Flores, 123',
        isActive: true,
      };

      // Act
      const result = await clientService.createClient(clientData);

      // Assert
      expect(result).toMatchObject({
        name: clientData.name,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        isActive: true, // Valor padrão
      });
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('deve criar cliente apenas com campos obrigatórios', async () => {
      // Arrange
      const clientData = {
        name: 'Maria Santos',
        email: 'maria.santos@exemplo.com',
        isActive: true,
      };

      // Act
      const result = await clientService.createClient(clientData);

      // Assert
      expect(result.name).toBe(clientData.name);
      expect(result.email).toBe(clientData.email);
      expect(result.phone).toBeNull();
      expect(result.address).toBeNull();
      expect(result.isActive).toBe(true);
    });

    it('deve lançar erro para email duplicado', async () => {
      // Arrange
      await prisma.client.create({
        data: {
          name: 'Cliente Existente',
          email: 'duplicado@exemplo.com',
          isActive: true,
        },
      });

      const clientData = {
        name: 'Novo Cliente',
        email: 'duplicado@exemplo.com', // Email duplicado
        isActive: true,
      };

      // Act & Assert
      await expect(clientService.createClient(clientData)).rejects.toThrow();
    });

    it('deve lançar erro para nome muito curto', async () => {
      // Arrange
      const clientData = {
        name: 'A', // Nome muito curto (menos de 2 caracteres)
        email: 'teste@exemplo.com',
        isActive: true,
      };

      // Act & Assert
      await expect(clientService.createClient(clientData)).rejects.toThrow();
    });

    it('deve lançar erro para email inválido', async () => {
      // Arrange
      const clientData = {
        name: 'Cliente Teste',
        email: 'email-invalido', // Email inválido
        isActive: true,
      };

      // Act & Assert
      await expect(clientService.createClient(clientData)).rejects.toThrow();
    });
  });

  describe('getClient - Buscar Cliente', () => {
    it('deve retornar cliente existente', async () => {
      // Arrange
      const createdClient = await prisma.client.create({
        data: {
          name: 'Cliente Busca Teste',
          email: 'busca@exemplo.com',
          phone: '+55 11 88888-8888',
          address: 'Av. Principal, 456',
          isActive: true,
        },
      });

      // Act
      const result = await clientService.getClient(createdClient.id);

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe(createdClient.id);
      expect(result?.name).toBe('Cliente Busca Teste');
      expect(result?.email).toBe('busca@exemplo.com');
      expect(result?.phone).toBe('+55 11 88888-8888');
      expect(result?.address).toBe('Av. Principal, 456');
    });

    it('deve retornar null para cliente inexistente', async () => {
      // Act
      const result = await clientService.getClient(99999);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getAllClients - Listar Todos os Clientes', () => {
    it('deve retornar todos os clientes cadastrados', async () => {
      // Arrange
      const client1 = await prisma.client.create({
        data: {
          name: 'Cliente 1',
          email: 'cliente1@exemplo.com',
          isActive: true,
        },
      });

      const client2 = await prisma.client.create({
        data: {
          name: 'Cliente 2',
          email: 'cliente2@exemplo.com',
          isActive: true,
        },
      });

      const client3 = await prisma.client.create({
        data: {
          name: 'Cliente 3',
          email: 'cliente3@exemplo.com',
          isActive: false,
        },
      });

      // Act
      const result = await clientService.getAllClients();

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map(c => c.id)).toContain(client1.id);
      expect(result.map(c => c.id)).toContain(client2.id);
      expect(result.map(c => c.id)).toContain(client3.id);
    });

    it('deve retornar lista vazia quando não há clientes', async () => {
      // Act
      const result = await clientService.getAllClients();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('updateClient - Atualizar Cliente', () => {
    it('deve atualizar cliente existente', async () => {
      // Arrange
      const createdClient = await prisma.client.create({
        data: {
          name: 'Cliente Original',
          email: 'original@exemplo.com',
          phone: '+55 11 77777-7777',
          address: 'Rua Antiga, 789',
        },
      });

      const updateData = {
        name: 'Cliente Atualizado',
        phone: '+55 11 66666-6666',
        address: 'Rua Nova, 321',
      };

      // Act
      const result = await clientService.updateClient(createdClient.id, updateData);

      // Assert
      expect(result.name).toBe(updateData.name);
      expect(result.phone).toBe(updateData.phone);
      expect(result.address).toBe(updateData.address);
      expect(result.email).toBe(createdClient.email); // Email não alterado
      expect(result.id).toBe(createdClient.id);
    });

    it('deve atualizar apenas campos fornecidos', async () => {
      // Arrange
      const createdClient = await prisma.client.create({
        data: {
          name: 'Cliente Teste',
          email: 'teste@exemplo.com',
          phone: '+55 11 55555-5555',
          address: 'Rua Teste, 123',
        },
      });

      const updateData = {
        name: 'Cliente Parcialmente Atualizado',
        // Apenas nome será atualizado
      };

      // Act
      const result = await clientService.updateClient(createdClient.id, updateData);

      // Assert
      expect(result.name).toBe(updateData.name);
      expect(result.email).toBe(createdClient.email);
      expect(result.phone).toBe(createdClient.phone);
      expect(result.address).toBe(createdClient.address);
    });

    it('deve lançar erro ao tentar atualizar cliente inexistente', async () => {
      // Arrange
      const updateData = {
        name: 'Cliente Inexistente',
      };

      // Act & Assert
      await expect(clientService.updateClient(99999, updateData)).rejects.toThrow();
    });

    it('deve lançar erro ao tentar atualizar para email duplicado', async () => {
      // Arrange
      await prisma.client.create({
        data: {
          name: 'Cliente 1',
          email: 'cliente1@exemplo.com',
          isActive: true,
        },
      });

      const client2 = await prisma.client.create({
        data: {
          name: 'Cliente 2',
          email: 'cliente2@exemplo.com',
          isActive: true,
        },
      });

      const updateData = {
        email: 'cliente1@exemplo.com', // Email já existente
      };

      // Act & Assert
      await expect(clientService.updateClient(client2.id, updateData)).rejects.toThrow();
    });
  });

  describe('deleteClient - Deletar Cliente', () => {
    it('deve deletar cliente existente', async () => {
      // Arrange
      const createdClient = await prisma.client.create({
        data: {
          name: 'Cliente para Deletar',
          email: 'deletar@exemplo.com',
        },
      });

      // Act
      await clientService.deleteClient(createdClient.id);

      // Assert
      const deletedClient = await prisma.client.findUnique({
        where: { id: createdClient.id },
      });
      expect(deletedClient).toBeNull();
    });

    it('deve lançar erro ao tentar deletar cliente inexistente', async () => {
      // Act & Assert
      await expect(clientService.deleteClient(99999)).rejects.toThrow();
    });
  });

  describe('getActiveClients - Buscar Clientes Ativos', () => {
    it('deve retornar apenas clientes ativos', async () => {
      // Arrange
      const activeClient1 = await prisma.client.create({
        data: {
          name: 'Cliente Ativo 1',
          email: 'ativo1@exemplo.com',
          isActive: true,
        },
      });

      const activeClient2 = await prisma.client.create({
        data: {
          name: 'Cliente Ativo 2',
          email: 'ativo2@exemplo.com',
          isActive: true,
        },
      });

      const inactiveClient = await prisma.client.create({
        data: {
          name: 'Cliente Inativo',
          email: 'inativo@exemplo.com',
          isActive: false,
        },
      });

      // Act
      const result = await clientService.getActiveClients();

      // Assert
      expect(result).toHaveLength(2);
      expect(result.map(c => c.id)).toContain(activeClient1.id);
      expect(result.map(c => c.id)).toContain(activeClient2.id);
      expect(result.map(c => c.id)).not.toContain(inactiveClient.id);
    });

    it('deve retornar lista vazia quando não há clientes ativos', async () => {
      // Arrange
      await prisma.client.create({
        data: {
          name: 'Cliente Inativo',
          email: 'inativo@exemplo.com',
          isActive: false,
        },
      });

      // Act
      const result = await clientService.getActiveClients();

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('deactivateClient - Desativar Cliente', () => {
    it('deve desativar cliente existente', async () => {
      // Arrange
      const createdClient = await prisma.client.create({
        data: {
          name: 'Cliente para Desativar',
          email: 'desativar@exemplo.com',
          isActive: true,
        },
      });

      // Act
      const result = await clientService.deactivateClient(createdClient.id);

      // Assert
      expect(result.isActive).toBe(false);
      expect(result.id).toBe(createdClient.id);
    });

    it('deve lançar erro ao tentar desativar cliente inexistente', async () => {
      // Act & Assert
      await expect(clientService.deactivateClient(99999)).rejects.toThrow();
    });
  });

  describe('activateClient - Ativar Cliente', () => {
    it('deve ativar cliente existente', async () => {
      // Arrange
      const createdClient = await prisma.client.create({
        data: {
          name: 'Cliente para Ativar',
          email: 'ativar@exemplo.com',
          isActive: false,
        },
      });

      // Act
      const result = await clientService.activateClient(createdClient.id);

      // Assert
      expect(result.isActive).toBe(true);
      expect(result.id).toBe(createdClient.id);
    });

    it('deve lançar erro ao tentar ativar cliente inexistente', async () => {
      // Act & Assert
      await expect(clientService.activateClient(99999)).rejects.toThrow();
    });
  });
});
