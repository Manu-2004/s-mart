import React, { useState, useEffect } from 'react';
import './Orders.css';
import BillModal from './BillModal';
import orderService from '../services/orderService';

const Orders = ({ isConnected }) => {
  const [filter, setFilter] = useState('all');
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load orders from database
  const loadOrders = async () => {
    if (!isConnected) {
      setError('Backend connection required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ordersData = await orderService.getAllOrders();
      const statsData = await orderService.getOrderStats();

      // Transform orders data to match frontend structure with your model
      const transformedOrders = ordersData.map(order => ({
        id: order._id,
        orderId: order.orderId,
        date: new Date(order.orderDate).toISOString().split('T')[0],
        customerName: order.customerInfo?.name || 'N/A',
        customerEmail: order.customerInfo?.email || 'N/A',
        customerPhone: order.customerInfo?.phone || 'N/A',
        items: order.items.map(item => ({
          id: item._id,
          name: item.productName,
          productId: item.productId,
          quantity: item.quantity,
          price: item.pricePerUnit,
          total: item.totalPrice
        })),
        totalAmount: order.totalAmount,
        status: order.status,
        orderTime: new Date(order.orderDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        completedTime: order.status === 'completed' ? 
          new Date(order.updatedAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }) : null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      }));

      setOrders(transformedOrders);
      setStats(statsData);
      console.log('Orders loaded:', transformedOrders);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders: ' + err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [isConnected]);

  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    return order.status === filter;
  });

  const handleCompleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to mark this order as completed?')) {
      try {
        console.log('Completing order with ID:', orderId);
        await orderService.updateOrderStatus(orderId, 'completed');
        await loadOrders(); // Refresh orders
        alert('Order marked as completed!');
      } catch (err) {
        alert('Failed to update order: ' + err.message);
        console.error('Error updating order:', err);
      }
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order? Stock will be restored.')) {
      try {
        console.log('Cancelling order with ID:', orderId);
        await orderService.cancelOrder(orderId);
        await loadOrders(); // Refresh orders
        alert('Order cancelled successfully! Stock has been restored.');
      } catch (err) {
        alert('Failed to cancel order: ' + err.message);
        console.error('Error cancelling order:', err);
      }
    }
  };

  const handleGenerateBill = (order) => {
    setSelectedOrder(order);
    setShowBillModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Show connection error if backend is down
  if (!isConnected) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="orders-header">
            <h1>Orders Management</h1>
          </div>
          <div className="connection-error">
            <div className="no-orders">
              <div className="no-orders-icon">❌</div>
              <h3>Cannot load orders</h3>
              <p>Backend connection required. Please ensure your server is running on port 5000.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="orders-header">
            <h1>Orders Management</h1>
          </div>
          <div className="loading-message">
            <div className="no-orders">
              <div className="no-orders-icon">⏳</div>
              <h3>Loading orders...</h3>
              <p>Please wait while we fetch your orders.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="orders-page">
        <div className="orders-container">
          <div className="orders-header">
            <h1>Orders Management</h1>
          </div>
          <div className="error-state">
            <div className="no-orders">
              <div className="no-orders-icon">⚠️</div>
              <h3>Error loading orders</h3>
              <p>{error}</p>
              <button className="retry-btn" onClick={loadOrders}>
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div className="orders-header">
          <div className="header-title">
            <h1>Orders Management</h1>
            <p className="orders-subtitle">Track and manage all your orders</p>
          </div>

          <div className="orders-stats">
            <div className="stat-card">
              <div className="stat-number">{stats.totalOrders}</div>
              <div className="stat-label">Total Orders</div>
            </div>
            <div className="stat-card pending">
              <div className="stat-number">{stats.pendingOrders}</div>
              <div className="stat-label">Pending</div>
            </div>
            <div className="stat-card completed">
              <div className="stat-number">{stats.completedOrders}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card revenue">
              <div className="stat-number">{formatCurrency(stats.totalRevenue)}</div>
              <div className="stat-label">Total Revenue</div>
            </div>
          </div>
        </div>

        <div className="orders-filters">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All Orders ({orders.length})
            </button>
            <button
              className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
              onClick={() => setFilter('pending')}
            >
              Pending ({stats.pendingOrders})
            </button>
            <button
              className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
              onClick={() => setFilter('completed')}
            >
              Completed ({stats.completedOrders})
            </button>
            <button
              className={`filter-btn ${filter === 'cancelled' ? 'active' : ''}`}
              onClick={() => setFilter('cancelled')}
            >
              Cancelled ({orders.filter(o => o.status === 'cancelled').length})
            </button>
          </div>
        </div>

        <div className="orders-content">
          {filteredOrders.length === 0 ? (
            <div className="no-orders">
              <div className="no-orders-icon">📋</div>
              <h3>No orders found</h3>
              <p>
                {orders.length === 0 
                  ? "No orders have been placed yet." 
                  : "No orders match your current filter criteria."
                }
              </p>
            </div>
          ) : (
            <div className="orders-grid">
              {filteredOrders.map(order => (
                <div key={order.id} className={`order-card ${order.status}`}>
                  <div className="order-header">
                    <div className="order-id-section">
                      <h3 className="order-id">{order.orderId}</h3>
                      <span className={`status-badge ${order.status}`}>
                        {order.status === 'pending' && '⏳ Pending'}
                        {order.status === 'completed' && '✅ Completed'}
                        {order.status === 'cancelled' && '❌ Cancelled'}
                      </span>
                    </div>
                    <div className="order-date">
                      <span className="date">{formatDate(order.date)}</span>
                      <span className="time">{order.orderTime}</span>
                    </div>
                  </div>

                  <div className="customer-info">
                    <h4>Customer Details</h4>
                    <div className="customer-details">
                      <p><strong>Name:</strong> {order.customerName}</p>
                      <p><strong>Email:</strong> {order.customerEmail}</p>
                      <p><strong>Phone:</strong> {order.customerPhone}</p>
                    </div>
                  </div>

                  <div className="order-items">
                    <h4>Items Ordered</h4>
                    <div className="items-list">
                      {order.items.map(item => (
                        <div key={item.id} className="item-row">
                          <span className="item-name">{item.name}</span>
                          <span className="item-quantity">x{item.quantity}</span>
                          <span className="item-price">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-footer">
                    <div className="order-total">
                      <strong>Total: {formatCurrency(order.totalAmount)}</strong>
                    </div>
                    <div className="order-actions">
                      {order.status === 'pending' ? (
                        <div className="pending-actions">
                          <button
                            className="complete-btn"
                            onClick={() => handleCompleteOrder(order.orderId)}
                          >
                            ✅ Mark as Completed
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={() => handleCancelOrder(order.orderId)}
                          >
                            ❌ Cancel Order
                          </button>
                        </div>
                      ) : order.status === 'completed' ? (
                        <div className="completed-actions">
                          <span className="completed-time">
                            Completed at {order.completedTime}
                          </span>
                          <button
                            className="bill-btn"
                            onClick={() => handleGenerateBill(order)}
                          >
                            📄 Generate Bill
                          </button>
                        </div>
                      ) : (
                        <div className="cancelled-actions">
                          <span className="cancelled-info">
                            Order was cancelled
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <BillModal
          isOpen={showBillModal}
          onClose={() => setShowBillModal(false)}
          order={selectedOrder}
        />
      </div>
    </div>
  );
};

export default Orders;
