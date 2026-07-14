import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    if (user.role === "user") {
      // User dashboard stats
      const [myBookings, pendingCount, approvedCount, rejectedCount] = await Promise.all([
        db.booking.count({ where: { userId: user.id } }),
        db.booking.count({ where: { userId: user.id, status: "pending" } }),
        db.booking.count({ where: { userId: user.id, status: "approved" } }),
        db.booking.count({ where: { userId: user.id, status: "rejected" } }),
      ])

      const upcomingBookings = await db.booking.findMany({
        where: {
          userId: user.id,
          startTime: { gte: now },
          status: { in: ["approved", "pending"] },
        },
        include: {
          facility: { select: { name: true, category: true, location: true } },
        },
        orderBy: { startTime: "asc" },
        take: 5,
      })

      return NextResponse.json({
        role: "user",
        stats: {
          totalBookings: myBookings,
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
        },
        upcomingBookings,
      })
    }

    if (user.role === "manager") {
      // Manager dashboard stats
      const managedFacilityIds = await db.facility.findMany({
        where: { managerId: user.id },
        select: { id: true },
      })
      const facilityIds = managedFacilityIds.map((f) => f.id)

      const [pendingCount, approvedCount, kivCount, rejectedCount, totalManaged] = await Promise.all([
        db.booking.count({
          where: { facilityId: { in: facilityIds }, status: "pending" },
        }),
        db.booking.count({
          where: { facilityId: { in: facilityIds }, status: "approved" },
        }),
        db.booking.count({
          where: { facilityId: { in: facilityIds }, status: "kiv" },
        }),
        db.booking.count({
          where: { facilityId: { in: facilityIds }, status: "rejected" },
        }),
        db.facility.count({ where: { managerId: user.id } }),
      ])

      const pendingBookings = await db.booking.findMany({
        where: {
          facilityId: { in: facilityIds },
          status: "pending",
        },
        include: {
          facility: { select: { name: true, category: true } },
          user: { select: { fullName: true, department: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 10,
      })

      // Popular facilities
      const popularFacilities = await db.facility.findMany({
        where: { managerId: user.id },
        select: {
          id: true,
          name: true,
          category: true,
          _count: { select: { bookings: true } },
        },
        orderBy: { bookings: { _count: "desc" } },
        take: 5,
      })

      return NextResponse.json({
        role: "manager",
        stats: {
          pending: pendingCount,
          approved: approvedCount,
          kiv: kivCount,
          rejected: rejectedCount,
          managedFacilities: totalManaged,
        },
        pendingBookings,
        popularFacilities,
      })
    }

    // Admin dashboard stats
    const [totalUsers, totalFacilities, totalBookings, pendingCount, approvedCount, kivCount, rejectedCount, cancelledCount] = await Promise.all([
      db.user.count(),
      db.facility.count({ where: { isActive: true } }),
      db.booking.count(),
      db.booking.count({ where: { status: "pending" } }),
      db.booking.count({ where: { status: "approved" } }),
      db.booking.count({ where: { status: "kiv" } }),
      db.booking.count({ where: { status: "rejected" } }),
      db.booking.count({ where: { status: "cancelled" } }),
    ])

    // Recent bookings
    const recentBookings = await db.booking.findMany({
      include: {
        facility: { select: { name: true, category: true } },
        user: { select: { fullName: true, department: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    })

    // Bookings by category
    const facilitiesByCategory = await db.facility.groupBy({
      by: ["category"],
      _count: true,
      where: { isActive: true },
    })

    // Bookings by status
    const bookingsByStatus = await db.booking.groupBy({
      by: ["status"],
      _count: true,
    })

    // Users by role
    const usersByRole = await db.user.groupBy({
      by: ["role"],
      _count: true,
    })

    return NextResponse.json({
      role: "admin",
      stats: {
        totalUsers,
        totalFacilities,
        totalBookings,
        pending: pendingCount,
        approved: approvedCount,
        kiv: kivCount,
        rejected: rejectedCount,
        cancelled: cancelledCount,
      },
      recentBookings,
      facilitiesByCategory,
      bookingsByStatus,
      usersByRole,
    })
  } catch (error) {
    console.error("Get dashboard stats error:", error)
    return NextResponse.json({ error: "Ralat pelayan" }, { status: 500 })
  }
}
