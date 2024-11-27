const webhook = async (req, res) => {
    const receivedData = req.body;
    res.status(200).json({
        receivedData: receivedData
    });
};

module.exports = { webhook };