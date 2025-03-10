/**
 * Type definitions for spatial operations in the game world.
 * These types support the spatial partitioning and location tracking systems.
 */

/**
 * Represents a 2D position vector with x and y coordinates
 */
export interface Vector2D {
    x: number;
    y: number;
}

/**
 * Represents a rectangular bounding box with minimum and maximum corners
 */
export interface BoundingBox {
    min: Vector2D;
    max: Vector2D;
}

/**
 * Represents a location in the game world with position and additional metadata
 */
export interface WorldLocation {
    id: string;
    name: string;
    position: Vector2D;
    size: number;  // Approximate radius or size of the location
    type: string;  // Village, city, dungeon, etc.
    description?: string;
    tags?: string[];
    connections?: string[];  // IDs of connected locations
}

/**
 * Utilities for working with spatial types
 */
export class SpatialUtils {
    /**
     * Calculate the distance between two Vector2D points
     */
    static distance(a: Vector2D, b: Vector2D): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * Check if a point is inside a bounding box
     */
    static pointInBox(point: Vector2D, box: BoundingBox): boolean {
        return (
            point.x >= box.min.x &&
            point.x <= box.max.x &&
            point.y >= box.min.y &&
            point.y <= box.max.y
        );
    }
    
    /**
     * Check if two bounding boxes intersect
     */
    static boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
        return (
            a.min.x <= b.max.x &&
            a.max.x >= b.min.x &&
            a.min.y <= b.max.y &&
            a.max.y >= b.min.y
        );
    }
    
    /**
     * Create a new bounding box from a center point and radius
     */
    static boxFromCenterAndRadius(center: Vector2D, radius: number): BoundingBox {
        return {
            min: {
                x: center.x - radius,
                y: center.y - radius
            },
            max: {
                x: center.x + radius,
                y: center.y + radius
            }
        };
    }
    
    /**
     * Calculate the center point of a bounding box
     */
    static centerOfBox(box: BoundingBox): Vector2D {
        return {
            x: (box.min.x + box.max.x) / 2,
            y: (box.min.y + box.max.y) / 2
        };
    }
    
    /**
     * Calculate the size (width and height) of a bounding box
     */
    static sizeOfBox(box: BoundingBox): { width: number, height: number } {
        return {
            width: box.max.x - box.min.x,
            height: box.max.y - box.min.y
        };
    }
    
    /**
     * Expand a bounding box by a specified amount in all directions
     */
    static expandBox(box: BoundingBox, amount: number): BoundingBox {
        return {
            min: {
                x: box.min.x - amount,
                y: box.min.y - amount
            },
            max: {
                x: box.max.x + amount,
                y: box.max.y + amount
            }
        };
    }
    
    /**
     * Check if a point is within a specified distance of another point
     */
    static isPointInRadius(center: Vector2D, point: Vector2D, radius: number): boolean {
        return this.distance(center, point) <= radius;
    }
    
    /**
     * Find the nearest point among a collection to a reference point
     */
    static findNearestPoint(reference: Vector2D, points: Vector2D[]): Vector2D | null {
        if (points.length === 0) return null;
        
        let nearest = points[0];
        let minDistance = this.distance(reference, nearest);
        
        for (let i = 1; i < points.length; i++) {
            const dist = this.distance(reference, points[i]);
            if (dist < minDistance) {
                minDistance = dist;
                nearest = points[i];
            }
        }
        
        return nearest;
    }
    
    /**
     * Calculate the midpoint between two points
     */
    static midpoint(a: Vector2D, b: Vector2D): Vector2D {
        return {
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2
        };
    }
} 