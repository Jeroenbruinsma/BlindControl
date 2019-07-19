const express = require('express')
var router = express.Router();
const auth = require('../login/middleware')
const Users = require('../user/model')
const Blind = require('../blind/model')

router.get('/ticketsforevent/:id', function (req, res, next) {
    console.log("GET /ticketsforevent/id no auth", req.params.id)
    Tickets.findAll({
        where: { eventId: req.params.id },
        attributes: ['id', 'pic_url', 'price', 'description', 'userId']
    })
        .then(ticket => {
            res.json({ TicketsList: ticket })
        })
        .catch(err => {
            res.status(500).json({
                message: 'Something went wrong',
                error: err
            })
        })
})

router.get('/myticket/:id', auth, function (req, res, next) {
    console.log("GET /myticket/id auth", req.params.id)
    const id = req.params.id
    return Tickets.findOne({
        where: { id },
        attributes: ['userId']
    })
        .then(ticket => {
            //console.log("req user", req.user.dataValues.id , "tick", this)
            if (req.user.dataValues.id === ticket.dataValues.userId) {
                return res.json({ Owner: "yes" })
            } else {
                return res.json({ Owner: "no" })
            }
        })
        .catch(err => {
            res.status(500).json({
                message: 'Something went wrong',
                error: err
            })
        })
})


router.get('/tickets/:id',  function (req, res, next) {
    console.log("GET /tickets/id auth", req.params.id)
    Tickets.findOne({
        where: { id: req.params.id },
        include: [
            {
                model: Users, as: 'user',
                attributes: ['name'],
                required: false
            }
        ]
    })
        .then(ticket => {
            calculateFraudRist(req.params.id)
                .then(fraudIndex => {
                    res.json({
                        Ticket: ticket,
                        fraudIndex: fraudIndex,
                        comments: { todo: "todo" }
                    })

                })

        })
        .catch(err => {
            console.log("router got an error", err)
            res.status(500).json({
                message: 'Something went wrong',
                error: err
            })
        })
})

function FindOwnerByTicket(ticketId) {
    return Tickets.findByPk(ticketId)
        .then(ticket => {
            if (ticket === null) {
                throw "Could not find owner"
            } else {
                return ticket.dataValues
            }
        })
}

function ticketTimeParser(ticketId) {
    return Tickets.findByPk(ticketId)
        .then(ticket => {
            if (ticket === null) {
                throw "Could not find ticket"
            } else {
                const dataTime = ticket.dataValues.createdAt
                const timeOfPostInGMT = JSON.stringify(dataTime).split('T')[1].split(':')[0]
                const postTime = Number(timeOfPostInGMT) + 2 //timezone correction
                if (postTime >= 9 && postTime < 17) {
                    return true
                } else {
                    return false
                }
            }
        })
}

function TicketsSoldByOwner(userId) {
    return Tickets.findAndCountAll({ where: { userId } })
        .then(ticket => {
            if (ticket === null) {
                throw "Could not find any tickets for this owner"
            } else {
                // console.log("found tickets for this owner:", ticket.count)
                return ticket.count
            }
        })
}
function ticketComments(ticketId) {
    return Comments.findAndCountAll({ where: { ticketId } })
        .then(comments => {
            if (comments === null) {
                throw "error finding the comments for this ticket"
            } else {
                return comments.count
            }
        })
}

function averageTicketPrice(eventId) {
    return Tickets.findAndCountAll({
        where: { eventId },
        attributes: ['price']
    })
        .then(tickets => {
            if (tickets === null) {
                throw "Could not find any tickets for this event"
            } else {
                newarr = tickets.rows.map(T => T.dataValues.price)
                avgPrice = newarr.reduce((total, amount) => (Number(total) + Number(amount)))
                return avgPrice / tickets.count
            }
        })
}


function fraudRisk(baseRisk,
    maxRisk,
    amountOfTicketsSoldByOwner,
    averageTicketPriceForEvent,
    ticketPrice,
    ticketsodlDuringBusnissHours,
    amountOfCommentsOnThisTicket) {

    let calculatedRisk = 0
    const pricedifference = Math.round((((ticketPrice - averageTicketPriceForEvent) / averageTicketPriceForEvent) * 100))

    if (amountOfTicketsSoldByOwner === 1) calculatedRisk += 10
    if (!ticketsodlDuringBusnissHours) calculatedRisk += 10
    if (ticketsodlDuringBusnissHours) calculatedRisk -= 10
    if (amountOfCommentsOnThisTicket > 3) calculatedRisk += 5
    if (amountOfCommentsOnThisTicket > 3) console.log("compensated for comments!")
    if (pricedifference <= 0) calculatedRisk += Math.abs(pricedifference)
    if (pricedifference >= 0) calculatedRisk -= Math.min(Math.max(Math.abs(pricedifference)), 10);

    // console.log("\n\n\n")
    // console.log("calculated risk of ticket is:", tmp)
    // console.log("amountOfTicketsSoldByOwner", amountOfTicketsSoldByOwner)
    // console.log("ticketsodlDuringBusnissHours", ticketsodlDuringBusnissHours)
    // console.log("amountOfCommentsOnThisTicket", amountOfCommentsOnThisTicket)
    // console.log("pricedifference", pricedifference)
    // console.log("\n\n\n")

    return Math.min(Math.max(calculatedRisk, baseRisk), maxRisk);
}


function calculateFraudRist(RawticketId) {

    const baseRisk = 5;
    const maxRisk = 95;
    const ticketId = Number(RawticketId)
    let ownerId = FindOwnerByTicket(ticketId);
    let amountOfTicketsSoldByOwner = 0;
    let ticketPrice = 0;
    let averageTicketPriceForEvent = true;
    let ticketsodlDuringBusnissHours = false;
    let amountOfCommentsOnThisTicket = 0;

    return ownerId
        .then(Owner => {
            eventId = Owner.eventId;
            ticketPrice = Number(Owner.price)
            return amountOfTicketsSoldByOwner = TicketsSoldByOwner(Owner.userId)
                .then(amount => {
                    amountOfTicketsSoldByOwner = amount
                    averageTicketPriceForEvent = averageTicketPrice(eventId)
                        .then(avgPrice => {
                            averageTicketPriceForEvent = avgPrice
                            return null
                        })
                        .catch(err => console.log("error in avg price calc", err))
                })
                .then(tmp => {
                    return ticketTimeParser(ticketId)
                        .then(ticketTimeing => {
                            ticketsodlDuringBusnissHours = ticketTimeing
                        }).then(notNeeded => {
                            return ticketComments(ticketId)
                                .then(result => {
                                    amountOfCommentsOnThisTicket = result
                                    return null
                                })
                        })
                })
                .catch(err => console.log("got an error", err))
        }).then(result => {
            const risk = fraudRisk(baseRisk, maxRisk,
                amountOfTicketsSoldByOwner,
                averageTicketPriceForEvent,
                ticketPrice,
                ticketsodlDuringBusnissHours,
                amountOfCommentsOnThisTicket)
            return risk
        })
        .catch(err => console.log("got an error", err))
}

router.post('/tickets', auth, function (req, res) {
    console.log("POST /tickets auth")
    if (req.body.TicketList) {
        const { eventId, description, pic_url, price } = req.body.TicketList

        if (eventId && description && pic_url && price) {
            const addTicket = {
                MakerId: req.user.dataValues.id,
                eventId: eventId,
                pic_url: pic_url,
                price: price,
                description: description,
                userId: req.user.dataValues.id
            }
            return Tickets
                .create(addTicket)
                .then(ticket => {
                    return ticket.dataValues.id
                })
                .then(NewId => {
                    res.json({ result: NewId })
                })
        } else {
            console.log("missing some info! ")
            Tickets.findAll()
                .then(ticketList => {
                    res.json({
                        TicketsList: ticketList,
                        message: "Not enough info"
                    })
                })
                .catch(err => res.status(500).send("something went wrong"))
        }
    }
    res.status(400).send("No body")
})

router.put('/tickets', auth, function (req, res) {
    console.log("PUT /tickets auth")

    if (req.body.TicketList) {
        const { eventId, description, pic_url, price, ticketId } = req.body.TicketList

        if (eventId && description && pic_url && price && ticketId) {
            const ChangeTicket = {

                pic_url: pic_url,
                price: price,
                description: description,
            }
            return Tickets
                .update(ChangeTicket, {
                    where: {
                        id: ticketId
                    }
                })
                .then(ticket => {
                    res.json({ result: "done" })
                })

        } else {
            console.log("missing some info! ")
            Tickets.findAll()
                .then(ticketList => {
                    res.json({
                        TicketsList: ticketList,
                        message: "Not enough info"
                    })
                })
                .catch(err => res.status(500).send("something went wrong"))
        }
    }
    res.status(400).send("No body")
})



module.exports = router;