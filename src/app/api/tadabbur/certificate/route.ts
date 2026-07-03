import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/db";
import { getUserFromSession, getUserDisplayName } from "@/lib/auth-helpers";
import { generateCertificateSVG, generateCertificateFilename } from "@/lib/certificate-generator";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.sub;
    
    // Get user display name from database
    const userName = await getUserDisplayName(userId);

    const body = await req.json();
    const { progressId, circleId, verseKey, verseTranslation } = body;

    if (!progressId || !circleId || !verseKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the progress belongs to the user
    const progress = await prisma.tadabburUserProgress.findUnique({
      where: { id: progressId },
      include: {
        circle: true,
      },
    });

    if (!progress || progress.userId !== userId) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // Check if all 15 days are completed (even if isComplete flag isn't set yet)
    const allDaysCompleted = progress.completedDays.length === progress.circle.totalDays;
    
    if (!allDaysCompleted) {
      return NextResponse.json({ 
        error: "Journey not yet complete",
        completedDays: progress.completedDays.length,
        totalDays: progress.circle.totalDays,
      }, { status: 400 });
    }

    // Update isComplete if not already set
    if (!progress.isComplete) {
      await prisma.tadabburUserProgress.update({
        where: { id: progressId },
        data: {
          isComplete: true,
          completedAt: new Date(),
        },
      });
    }

    // Check if certificate already exists
    const existing = await prisma.tadabburCertificate.findUnique({
      where: { progressId },
    });

    if (existing) {
      // Generate fresh SVG for download
      const verificationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/tadabbur/certificate/verify/${existing.id}`;
      
      const svg = await generateCertificateSVG({
        userName,
        verseKey: existing.verseKey,
        verseText: verseTranslation || `Quran ${existing.verseKey}`,
        completedAt: existing.completedAt,
        certificateId: existing.id,
        verificationUrl,
      });

      return NextResponse.json({ 
        message: "Certificate already exists",
        certificate: existing,
        svg,
        filename: generateCertificateFilename(existing.verseKey, existing.completedAt, 'svg'),
      });
    }

    // Generate certificate text
    const certificateText = generateCertificateText(
      verseKey,
      progress.circle.verseKey,
      progress.completedAt || new Date()
    );

    const verificationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/tadabbur/certificate/verify/`;

    // Create certificate
    const certificate = await prisma.tadabburCertificate.create({
      data: {
        userId,
        progressId,
        circleId,
        verseKey,
        completedAt: progress.completedAt || new Date(),
        certificateText,
        shareableUrl: verificationUrl, // Will be updated with ID
      },
    });

    // Update with full URL including certificate ID
    const fullVerificationUrl = `${verificationUrl}${certificate.id}`;
    await prisma.tadabburCertificate.update({
      where: { id: certificate.id },
      data: { shareableUrl: fullVerificationUrl },
    });

    // Generate SVG
    const svg = await generateCertificateSVG({
      userName,
      verseKey: certificate.verseKey,
      verseText: verseTranslation || `Quran ${certificate.verseKey}`,
      completedAt: certificate.completedAt,
      certificateId: certificate.id,
      verificationUrl: fullVerificationUrl,
    });

    return NextResponse.json({
      message: "Certificate generated successfully",
      certificate: { ...certificate, shareableUrl: fullVerificationUrl },
      svg,
      filename: generateCertificateFilename(certificate.verseKey, certificate.completedAt, 'svg'),
    });
  } catch (error) {
    console.error("[/api/tadabbur/certificate POST]", error);
    return NextResponse.json({ error: "Failed to generate certificate" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.sub;

    // Get all certificates for the user
    const certificates = await prisma.tadabburCertificate.findMany({
      where: { userId },
      include: {
        progress: {
          include: {
            circle: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    return NextResponse.json({ certificates });
  } catch (error) {
    console.error("[/api/tadabbur/certificate GET]", error);
    return NextResponse.json({ error: "Failed to fetch certificates" }, { status: 500 });
  }
}

function generateCertificateText(verseKey: string, verseText: string, completedAt: Date): string {
  const formattedDate = completedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `This certifies that the bearer has completed a 15-day deep study of Quran verse ${verseKey}.

Over the course of 15 days, they explored this sacred verse through multiple dimensions:

• Recitation and deep listening
• Linguistic analysis and word-by-word study
• Historical context and circumstances of revelation
• Stories of the Prophet's companions
• Classical tafsir from renowned scholars
• Personal reflection and spiritual connection
• Natural world parallels and signs of creation
• Connections with similar verses
• Personal supplication derived from the verse
• 7th century Arabian historical context
• Contemporary scholarly perspectives
• Holistic integration of all angles
• Islamic calligraphic tradition
• Applications across the four madhahib

Through this journey, they have transformed their relationship with this verse from mere reading to deep understanding and lived experience.

Completed on ${formattedDate}

"Indeed, in the remembrance of Allah do hearts find rest." (Quran 13:28)`;
}
