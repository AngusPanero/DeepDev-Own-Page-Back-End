const express = require('express');
const productRouter = express.Router();
const Product = require('../models/productModel');
const Category = require("../models/CategorySchema")
const Favorite = require("../models/FavoriteSchema")
const Reseñas = require("../models/ReseñasSchema")
const Coupon = require("../models/CouponSchema")
const mongoose = require('mongoose');   

// CSV EXCEL
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { refreshToken } = require('firebase-admin/app');
const upload = multer({ dest: 'uploads/' }); // Carpeta temporal

const esProduccion = (process.env.NODE_ENV === 'pproduction');

// CREATE INDIVIDUAL
productRouter.post("/api/product/create", async (req, res) => {
    const { formData } = req.body;
    console.log("FORM DATA", formData);

    if (!formData.nombre || !formData.sku_padre || !formData.marca || !formData.precio_base || !formData.stock_base) {
        return res.status(400).json({ message: "Faltan campos obligatorios! 🔴" });
    }

    if (!Array.isArray(formData.imagenes_generales) || formData.imagenes_generales.length === 0) {
        return res.status(400).json({ message: "Debes subir al menos una imagen general del producto! 🔴" });
    }

    /* if (!Array.isArray(formData.variantes) || formData.variantes.length === 0) {
        return res.status(400).json({ message: "El producto debe tener al menos una variante definida. 🔴" });
    } */
    try {
        const newProduct = await Product.create(formData);
        res.status(201).json({ message: "Product created successfully! 🟢", product: newProduct });

    } catch (error) {
        // Error print debugging
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = POST /create:`, error);

        if (error.code === 11000) {
            return res.status(409).json({ status: 'error', message: 'El SKU_PADRE o uno de los SKU_VARIANTE ya existe en la base de datos.'});
        }
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_CREATING_PRODUCT 🔴", dev_details: !esProduccion ? error.message : undefined });
    }
})

// READ INDIVIDUAL
productRouter.get("/api/product/:id", async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ObjectID format is invalid!. 🔴" });
    }
    try {
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found! 🔴" });
        }
        res.status(200).json({ message: "Product found successfully! 🟢", product });
    } catch(error) {
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = GET /:id:`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_READING_PRODUCT! 🔴", dev_details: !esProduccion ? error.message : undefined });
    }
})

// READ BY NAME
/* productRouter.get("/api/products", async (req, res) => {
    const { search } = req.query;
    let query = {};

    if (search) {
        query = {
            $or: [
                { nombre: { $regex: search, $options: "i" } }, // "i" es case-insensitive
                { sku_padre: { $regex: search, $options: "i" } },
                { marca: { $regex: search, $options: "i" } },
                { categorias: { $regex: search, $options: "i" } }
            ]
        };
    }

    const products = await Product.find(query);
    res.json({ products });
}); */

// READ ALL
productRouter.get("/api/products", async (req, res) => {
    try { 
        const products = await Product.find(); 

        res.status(200).json({ message: "Products fetched successfully! 🟢", products });

    } catch(error) {
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = GET :`, error);
        res.status(500).json({ 
            message: "INTERNAL_SERVER_ERROR_READING_PRODUCTS! 🔴", 
            error: error.message 
        });
    }
});

// READ ALL LIMIT/OFF-SET
productRouter.get("/api/products/limit", async (req, res) => {
    try {
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;

        const [products, total] = await Promise.all([
            Product.find().sort({ createdAt: -1 }).limit(limit).skip(offset), Product.countDocuments()]);

        res.status(200).json({ message: "Products fetched successfully! 🟢", products, total });

    } catch(error) {
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = GET :`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_READING_PRODUCTS! 🔴", error: error.message });
    }
});

// UPDATE INDIVIDUAL
productRouter.put("/api/product/update/:id", async (req, res) => {
    const { id } = req.params
    const { formData } = req.body

    console.log("FORMDATA", formData);
    

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ObjectID format is invalid!. 🔴" });
    }
    try {
        const updatedProduct = await Product.findByIdAndUpdate(id, { $set: formData }, { new: true, runValidators: true, context: 'query' });
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found! 🔴" });
        }
        res.status(200).json({ message: "Product updated successfully! 🟢", product: updatedProduct });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ status: 'error', message: "Error: El SKU que intentas asignar ya está siendo usado por otro producto. 🔴" });
        }
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = PUT /:id:`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_UPDATING_PRODUCT! 🔴", dev_details: !esProduccion ? error.message : undefined });
    }
})

// UPDATE VARIANT
productRouter.patch("/api/product/update-variant/:variantId", async (req, res) => {
    try {
        const { variantId } = req.params;
        const { formData } = req.body; 

        const updateQuery = {};
        for (const llave in formData) {
            updateQuery[`variantes.$.${llave}`] = formData[llave];
        }

        const productoActualizado = await Product.findOneAndUpdate(
            { "variantes._id": variantId },
            { $set: updateQuery },
            { new: true, runValidators: true } 
        );

        if (!productoActualizado) {
            return res.status(404).json({ message: "No se encontró la variante con ese ID ❌" });
        }

        res.status(200).json({ 
            message: "Variante actualizada con éxito ✅", 
            product: productoActualizado 
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = PATCH VARIANT /:id:`, error);
        res.status(500).json({ message: "Error interno", error: error.message });
    }
});

// MASSIVE UPDATE
productRouter.patch("/api/bulk-update", async (req, res) => {
    const { ids, cambios } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
            message: "Debes seleccionar al menos un producto para actualizar. 🔴" 
        });
    }

    try {
        let updateQuery = {};
        let setFields = {};

        if (cambios.estado) {
            setFields.estado = cambios.estado;
        }

        if (cambios.marca) {
            setFields.marca = cambios.marca;
        }

        if (typeof cambios.en_promocion !== 'undefined') {
            setFields.en_promocion = cambios.en_promocion;
        }
        if (typeof cambios.porcentaje_promo !== 'undefined') {
            setFields.porcentaje_promo = cambios.porcentaje_promo;
        }

        if (Object.keys(setFields).length > 0) {
            updateQuery.$set = setFields;
        }

        if (cambios.porcentaje_precio) {
            const factor = 1 + (cambios.porcentaje_precio / 100);
            updateQuery.$mul = { precio_base: factor };
        }

        if (typeof cambios.stock_a_sumar === 'number') {
            updateQuery.$inc = { "variantes.$[].stock": cambios.stock_a_sumar };
        }

        const result = await Product.updateMany(
            { _id: { $in: ids } }, 
            updateQuery, 
            { runValidators: true }
        );

        res.status(200).json({ 
            message: "Actualización masiva completada con éxito! 🟢", 
            detalles: { 
                total_seleccionados: ids.length, 
                total_modificados: result.modifiedCount 
            }
        });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] 🚨 ERROR en bulk-update:`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_IN_BULK_UPDATE! 🔴" });
    }
});

// DELETE INDIVIDUAL
productRouter.delete("/api/product/delete/:id", async (req, res) => {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "ObjectID format is invalid!. 🔴" });
    }
    try {
        const deletedProduct = await Product.findByIdAndDelete(id);
        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found! 🔴" });
        }
        res.status(200).json({ message: "Product deleted successfully! 🟢", product: deletedProduct });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ status: 'error', message: "Error: El SKU que intentas asignar ya está siendo usado por otro producto. 🔴" });
        }
        console.error(`[${new Date().toISOString()}] ERROR en productRouter = DELETE /:id:`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_DELETING_PRODUCT! 🔴", dev_details: !esProduccion ? error.message : undefined });
    }
})

// MASSIVE DELETE
productRouter.delete("/api/bulk-delete", async (req, res) => {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ 
            message: "Debes seleccionar al menos un producto para eliminar. 🔴" 
        });
    }
    try {
        const result = await Product.deleteMany({ _id: { $in: ids } }); 

        res.status(200).json({ message: "Massive delete made successfully! 🟢", detalles: { total_seleccionados: ids.length, total_eliminados: result.deletedCount } });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] 🚨 ERROR en bulk-delete:`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_IN_BULK_DELETE! 🔴", dev_details: process.env.NODE_ENV !== 'production' ? error.message : undefined });
    }
});

// GET EXPORT CSV
productRouter.get("/api/products/export-csv", async (req, res) => {
    try {
        const productos = await Product.find({}).lean();
        const BOM = '\uFEFF';
        
        // Encabezados idénticos a los nombres de tu Schema
        const headers = [
            "_id", "nombre", "marca", "sku_padre", "estado", "precio_base", 
            "categorias", "descripcion", "imagenes_generales", 
            "peso", "ancho", "alto", "largo", 
            "variantes"
        ];

        let csvContent = headers.join(";") + "\n";

        productos.forEach(p => {
            // Unimos arrays con el separador |
            const categoriasStr = p.categorias ? p.categorias.join(" | ") : "";
            const imagenesStr = p.imagenes_generales ? p.imagenes_generales.join(" | ") : "";
            
            // Formato variante: sku_variante,talle,color,medida,stock,precio_adicional,foto_variante
            const variantesStr = p.variantes ? p.variantes.map(v => 
                `${v.sku_variante || ''},${v.talle || ''},${v.color || ''},${v.medida || ''},${v.stock || 0},${v.precio_adicional || 0},${v.foto_variante || ''}`
            ).join(" | ") : "";

            const row = [
                p._id,
                `"${p.nombre}"`,
                `"${p.marca}"`,
                `"${p.sku_padre}"`,
                p.estado,
                p.precio_base,
                `"${categoriasStr}"`,
                `"${(p.descripcion || "").replace(/;/g, ',').replace(/\n/g, ' ')}"`,
                `"${imagenesStr}"`,
                p.medidas_empaque?.peso || 0,
                p.medidas_empaque?.ancho || 0,
                p.medidas_empaque?.alto || 0,
                p.medidas_empaque?.largo || 0,
                `"${variantesStr}"`
            ];

            csvContent += row.join(";") + "\n";
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=productos_db.csv');
        return res.status(200).send(BOM + csvContent);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en EXPORT CSV = GET`, error);
        res.status(500).json({ message: "Error al exportar", error: error.message });
    }
});

// UPLOAD EXPORT CSV
productRouter.post("/api/products/bulk-import", upload.single('archivo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Archivo no encontrado" });

    const resultados = [];
    let procesados = 0;

    const procesar = () => {
        return new Promise((resolve, reject) => {
            fs.createReadStream(req.file.path)
                .pipe(csv({ separator: ';' }))
                .on('data', (data) => resultados.push(data))
                .on('end', async () => {
                    try {
                        for (const fila of resultados) {
                            if (!fila.sku_padre) continue;

                            // Procesar el string de variantes
                            let variantesArray = [];
                            if (fila.variantes && fila.variantes.trim() !== "") {
                                variantesArray = fila.variantes.split('|').map(vStr => {
                                    const [sku, talle, color, medida, stock, precio_ad, foto] = vStr.split(',').map(s => s.trim());
                                    return {
                                        sku_variante: sku,
                                        talle: talle || null,
                                        color: color || null,
                                        medida: medida || null,
                                        stock: Number(stock) || 0,
                                        precio_adicional: Number(precio_ad) || 0,
                                        foto_variante: foto || null
                                    };
                                }).filter(v => v.sku_variante);
                            }

                            const datosProducto = {
                                nombre: fila.nombre,
                                marca: fila.marca,
                                sku_padre: fila.sku_padre.trim(),
                                precio_base: Number(fila.precio_base) || 0,
                                estado: fila.estado || 'activo',
                                descripcion: fila.descripcion,
                                categorias: fila.categorias ? fila.categorias.split('|').map(c => c.trim()) : [],
                                imagenes_generales: fila.imagenes_generales ? fila.imagenes_generales.split('|').map(i => i.trim()) : [],
                                variantes: variantesArray,
                                medidas_empaque: {
                                    peso: Number(fila.peso) || 0,
                                    ancho: Number(fila.ancho) || 0,
                                    alto: Number(fila.alto) || 0,
                                    largo: Number(fila.largo) || 0
                                }
                            };

                            await Product.findOneAndUpdate(
                                { sku_padre: datosProducto.sku_padre },
                                { $set: datosProducto },
                                { upsert: true, runValidators: true }
                            );
                            procesados++;
                        }
                        resolve();
                    } catch (err) { reject(err); }
                });
        });
    };

    try {
        await procesar();
        fs.unlinkSync(req.file.path);
        res.status(200).json({ message: `Se procesaron ${procesados} productos correctamente.` });
    } catch (error) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        console.error(`[${new Date().toISOString()}] ERROR en IMPORT CSV = POST`, error);
        res.status(500).json({ message: "Error en importación", error: error.message });
    }
});

// CATEGORIA CREATE
productRouter.post("/api/categories", async (req, res) => {
    try {
        const { nombre } = req.body;
        
        const nuevaCategoria = new Category({ nombre });
        await nuevaCategoria.save(); 
        
        res.status(201).json(nuevaCategoria);
    } catch (error) {
        
        if (error.code === 11000) {
            return res.status(400).json({ 
                message: "ERROR_SYSTEM: LA_CATEGORIA_YA_EXISTE_EN_DB" 
            });
        }
        console.error(`[${new Date().toISOString()}] ERROR en CREAR CATEGORIA POST`, error);
        res.status(500).json({ message: "ERROR_INTERNAL_SERVER" });
    }
});

// READ CATEGORÍA
productRouter.get("/api/categories", async (req, res) => {
    try {
        const categorias = await Category.find();

        res.status(200).json({ message: "Categories found successfully! 🟢", categorias });
    } catch(error) {
        console.error(`[${new Date().toISOString()}] ERROR en productRouter LEER CATEGORIAS = GET :`, error);
        res.status(500).json({ message: "INTERNAL_SERVER_ERROR_READING_PRODUCTS! 🔴", dev_details: !esProduccion ? error.message : undefined });
    }
})

// BORRAR CATEGORÍA
productRouter.delete("/api/categories/:id", async (req, res) => {
    try {
        await Category.findByIdAndDelete(req.params.id);

        const categoriasActualizadas = await Category.find();
        
        res.status(200).json({ message: "Categoría eliminada", categoriasActualizadas });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR en BORRAR CATEGORIA DELETE`, error);
        res.status(500).json({ message: "Error al borrar" });
    }
});

//FAVORITOS
productRouter.post('/api/product/toggle-fav', async (req, res) => {
    const { nombre, userEmail, productId, isFavorite } = req.body;
    console.log("FAVORITO", req.body);
    
    if (!userEmail || !productId) {
        return res.status(400).json({ message: "Faltan datos requeridos" });
    }

    try {
        if (isFavorite) {
            const newFavorite = new Favorite({ nombre, userEmail, productId });
            await newFavorite.save();

            return res.status(201).json({ message: "Agregado a favoritos", active: true });
        } else {
            await Favorite.findOneAndDelete({ nombre, userEmail, productId });

            return res.status(200).json({ message: "Eliminado de favoritos", active: false });
        }
    } catch (error) {
        if (error.code === 11000) {
            return res.status(200).json({ message: "Ya estaba en favoritos", active: true });
        }
        res.status(500).json({ message: "Error en el servidor", error });
    }
});


productRouter.get('/api/product/fav/:email', async (req, res) => {
    try {
        const favorites = await Favorite.find({ userEmail: req.params.email })
        res.status(200).json(favorites);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener favoritos", error });
    }
});

// FILTROS
productRouter.get('/api/products/brands', async (req, res) => {
    try {
        const brands = await Product.distinct('marca', { estado: 'activo' });
        res.status(200).json(brands.sort());
    } catch (error) {
        res.status(500).json([]);
    }
});

productRouter.get(['/api/products/limit', '/api/products/filter'], async (req, res) => {
    try {
        const { limit = 20, offset = 0, nombre, marca, categoria, talle, minPre, maxPre, promo, stock } = req.query;
        let query = { estado: 'activo' };

        // Solo agregamos al query si el valor existe y NO es un string vacío
        if (nombre && nombre !== "") {
            query.$or = [
                { nombre: { $regex: nombre, $options: 'i' } },
                { sku_padre: { $regex: nombre, $options: 'i' } }
            ];
        }

        if (marca && marca !== "") query.marca = marca;
        
        if (categoria && categoria !== "") query.categorias = categoria; 

        if (promo === 'true') query.en_promocion = true;

        if (minPre || maxPre) {
            query.precio_base = {};
            if (minPre && minPre !== "") query.precio_base.$gte = Number(minPre);
            if (maxPre && maxPre !== "") query.precio_base.$lte = Number(maxPre);
        }

        if (stock === 'true') {
            query.$or = [{ stock_base: { $gt: 0 } }, { 'variantes.stock': { $gt: 0 } }];
        }

        if (talle && talle !== "") query['variantes.talle'] = talle;

        const products = await Product.find(query)
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const total = await Product.countDocuments(query);

        res.status(200).json({ products, total });
    } catch (error) {
        res.status(500).json({ error: "INTERNAL_ERROR" });
    }
});

// RESEÑAS PRODUCTOS
productRouter.post("/api/product/rating", async (req, res) => {
    const { reviewData } = req.body
    try {
        if(!reviewData){
            return res.status(400).json({ message: "All fields are required to create a product review! 🔴" })
        }
        const review = await Reseñas.create(reviewData)
        res.status(201).json({ message: "Review created successfully! 🟢", review })

    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR AL CREAR REVIEW DE PRODUCTO`, error);
        res.status(500).json({ error: "INTERNAL_ERROR_PRODUCT REVIEW" });
    }
})

productRouter.get("/api/product-reviews", async (req, res) => {
    try {
        const reviews = await Reseñas.find()
        res.status(200).json({ message: "Reviews downloaded successfully! 🟢", reviews })
    } catch (error) {
        console.error(`[${new Date().toISOString()}] ERROR TRAER REVIEWS DE PRODUCTO`, error);
        res.status(500).json({ error: "INTERNAL ERROR TRAER REVIEWs DE PRODUCTO" });   
    }
})

module.exports = productRouter; 