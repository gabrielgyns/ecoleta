import { Request, Response } from 'express';
import knex from '../database/connection';

class PointsController {

    async index(req: Request, resp: Response) {
        const { city, uf, items } = req.query;

        const parsedItems = String(items)
            .split(',')
            .map(item => Number(item.trim()));
        
        const points = await knex('points')
            .join('point_items', 'points.id', '=', 'point_items.point_id')
            .whereIn('point_items.item_id', parsedItems)
            .where('city', String(city))
            .where('uf', String(uf))
            .distinct()
            .select('points.*');
        
        return resp.json(points);
    }

    async show(req: Request, resp: Response) {
        const { id } = req.params;

        const point = await knex('points').where('id', id).first();

        if (!point) {
            return resp.status(400).json('Point not found!');
        }

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return resp.json({ point, items });
    }

    async create(req: Request, resp: Response) {
        const { 
            name, 
            email, 
            whatsapp, 
            city, 
            uf, 
            latitude, 
            longitude,
            items 
        } = req.body;
        
        // Iniica transação do banco de dados.
        const trx = await knex.transaction();

        // Objeto point a ser criado com as informações retiradas de req.body.
        const point = {
            image: 'https://images.unsplash.com/photo-1556767576-5ec41e3239ea?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=400&q=60',
            name, 
            email, 
            whatsapp, 
            city, 
            uf, 
            latitude, 
            longitude,
        };
        
        // Insere com knex o objeto point na sua respectiva tabela.
        const insertedIds = await trx('points').insert(point);
        
        // Pega o retorno do ID dos points cadastrados.
        const point_id = insertedIds[0];
        
        // Cria o objeto a ser cadastrado na tabela point_items (relacionamento point_id e item_id).
        const pointItems = items.map((item_id: number) => {
            return {
                item_id,
                point_id
            };
        });

        // Cria a tabela de relação N-N entre POINTS e ITEMS passando o objeto em questão.
        await trx('point_items').insert(pointItems);

        // Comitar transação.
        await trx.commit();

        // Retorna o Point criado junto com o ID do mesmo.
        return resp.json({
            id: point_id,
            ...point,
        });
    }
}

export default PointsController;