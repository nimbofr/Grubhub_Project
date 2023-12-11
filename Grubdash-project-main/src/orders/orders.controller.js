const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

// TODO: Implement the /orders handlers needed to make the tests pass

function list(req, res, next) {
    res.status(200).json({data: orders})
}

function validateBodyExists(req, res, next) {
    const data = req.body.data
    if(data) {
        next()
    } else {
        next({
            status: 400,
            message: `Request must include data`
        })
    }
}

function validateTextExistsFunction(field) {
    const validateTextExists = (req, res, next) => {
        if(req.body.data[field]) {
            //stores request body data for later use
            res.locals[field] = req.body.data[field]
            next()
        } else {
            next({
                status: 400,
                message: `Order must include a ${field}`
            })
        }
    }
    return validateTextExists
}

//checks if its an array and has a length greater than 0
function validateDishes(req, res, next) {
    if(Array.isArray(res.locals.dishes) && res.locals.dishes.length > 0) {
        next()
    } else {
        next({
            status: 400,
            message: `Order must include at least one dish`
        })
    }
}

//loop through each dish in the array and check if the quantity exists, is a number, and is greater than 0
function validateDishesQuantity(req, res, next) {
    res.locals.dishes.forEach((dish, index) => {
        if(!dish.quantity || typeof dish.quantity !== "number" || dish.quantity <= 0) {
            next({
                status: 400,
                message: `Dish ${index} must have a quantity that is an integer greater than 0`
            })
        }
    });
    next()
}

function create(req, res, next) {
    const newOrder = {
        id: nextId(),
        deliverTo: res.locals.deliverTo,
        mobileNumber: res.locals.mobileNumber,
        status: "pending",
        dishes: res.locals.dishes
    }
    orders.push(newOrder)
    res.status(201).json({data: newOrder})
}

function validateOrderExists(req, res, next) {
    const {orderId} = req.params
    //searches for index number of orderId in params
    const foundIndex = orders.findIndex(order=>order.id === orderId)
    if(foundIndex < 0) {
        next({
            status: 404,
            message: `Order does not exist: ${orderId}.`
        })
    } else {
        //stores for later use
        res.locals.foundIndex = foundIndex
        res.locals.foundOrder = orders[foundIndex]
        next()
    }
}

function read(req, res, next) {
    res.status(200).json({data: res.locals.foundOrder})
}

function validateBodyStatus(req, res, next) {
    const {status} = req.body.data
    //list all possible values for status
    const statusAllowedStates = ["pending", "preparing", "out-for-delivery", "delivered"]
    if(status && statusAllowedStates.includes(status)) {
        res.locals.status = status
        next()
    } else {
        next({
            status: 400,
            message: `Order must have a status of pending, preparing, out-for-delivery, delivered`
        })
    }
}

function validateExistingStatus(req, res, next) {
    if(res.locals.foundOrder.status !== "delivered") {
        next()
    } else {
        next({
            status: 400,
            message: `A delivered order cannot be changed`
        })
    }
}

function validateBodyId(req, res, next) {
    const {id} = req.body.data
    const {orderId} = req.params
    //if the id exists, check if it checks the dishId in params
    if(id) {
        if(id === orderId) {
            next()
        } else {
            next({
                status: 400,
                message: `Order id does not match route id. Dish: ${id}, Route: ${orderId}`
            })
        }
    } else {
        next()
    }
}

function update(req, res, next) {
    //spread foundOrder to populate with id
    const updatedOrder = {
        ...res.locals.foundOrder,
        deliverTo: res.locals.deliverTo,
        mobileNumber: res.locals.mobileNumber,
        status: res.locals.status,
        dishes: res.locals.dishes
    }
    //removes at the foundIndex and replaces with updatedDish
    orders.splice(res.locals.foundIndex, 1, updatedOrder)
    res.json({data: updatedOrder})
}

function validateIfStatusPending(req, res, next) {
    if(res.locals.foundOrder.status !== "pending") {
        next({
            status: 400,
            message: `An order cannot be deleted unless it is pending`
        })
    } else {
        next()
    }
}

function destroy(req, res, next) {
    orders.splice(res.locals.foundIndex, 1)
    res.sendStatus(204)
}

module.exports = {
    list,
    create: [
        validateBodyExists,
        ...["deliverTo", "mobileNumber", "dishes"].map(field=>validateTextExistsFunction(field)),
        validateDishes,
        validateDishesQuantity,
        create
    ],
    read: [
        validateOrderExists,
        read
    ],
    update: [
        validateOrderExists,
        validateBodyExists,
        ...["deliverTo", "mobileNumber", "dishes"].map(field=>validateTextExistsFunction(field)),
        validateDishes,
        validateDishesQuantity,
        validateBodyStatus,
        validateExistingStatus,
        validateBodyId,
        update
    ],
    destroy: [
        validateOrderExists,
        validateIfStatusPending,
        destroy
    ]
}