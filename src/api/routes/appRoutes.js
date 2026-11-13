const express = require('express');
const router = express.Router();
const { 
    getTotalWaterByTank, 
    getPumpsSummary, 
    getPumpHistory 
} = require('../controllers/pumpController');

router.get('/summary', getPumpsSummary);
router.get('/:tankCode/total-water', getTotalWaterByTank);
router.get('/:tankCode/history', getPumpHistory);

module.exports = router;