const loadModel = require('../services/loadModel');
const runInference = require('../services/inferenceService');
const storeData = require('../services/storeData');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

let model;

const handler = {
    async loadModelHandler(request, h) {
        try {
            model = await loadModel('https://storage.googleapis.com/modelfv/models/model.json');
            return h.response({ message: 'Model loaded successfully' }).code(200);
        } catch (error) {
            return h.response({ error: error.message }).code(500);
        }
    },

    async predictHandler(request, h) {
        try {
            if (!model) {
                throw new Error('Model is not loaded. Load the model first.');
            }

            const { file } = request.payload.image;
            const imageBuffer = await file.toBuffer();
            const tensor = tf.node.decodeImage(imageBuffer).resizeNearestNeighbor([224, 224]).toFloat().expandDims();

            const prediction = await runInference(model, tensor);
            const detectedVegetable = prediction[0];

            const recipes = getRecipeRecommendations(detectedVegetable);
            await storeData('predictions', { detectedVegetable, recipes });

            return h.response({ detectedVegetable, recipes }).code(200);
        } catch (error) {
            return h.response({ error: error.message }).code(400);
        }
    },
};

const getRecipeRecommendations = (vegetable) => {
    const recipeDatabase = {
        carrot: [
            { title: 'Papaya Soup', ingredients: ['papaya', 'onion', 'garlic'], instructions: 'Boil everything and blend.' },
            { title: 'Papaya Salad', ingredients: ['papaya', 'lettuce', 'olive oil'], instructions: 'Mix everything.' },
            { title: 'Papaya Cake', ingredients: ['papaya', 'flour', 'sugar'], instructions: 'Bake it.' },
        ],
    };

    return recipeDatabase[vegetable] || [];
};

module.exports = handler;
